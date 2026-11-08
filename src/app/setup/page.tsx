"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { requireLoggedIn } from "@/lib/supabase/requireAuth";
import {
  fetchCompanies,
  upsertCompany,
  type DbCompany,
} from "@/lib/supabase/data";

type Loom = {
  id: string;
  company_id: string;
  loom_number: string;
  target_per_shift: number;
};

export default function SetupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [looms, setLooms] = useState<Loom[]>([]);
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("15");
  const [loomNumber, setLoomNumber] = useState("");
  const [target, setTarget] = useState("500");

  const loadLooms = async (companyId: string) => {
    const { data } = await getSupabase()
      .from("looms")
      .select("*")
      .eq("company_id", companyId)
      .order("loom_number");
    setLooms((data || []) as Loom[]);
  };

  const load = async () => {
    const auth = await requireLoggedIn();
    if (!auth.ok) {
      router.replace("/login");
      return;
    }
    if (!isSupabaseConfigured()) {
      setMsg("Supabase not configured");
      setReady(true);
      return;
    }
    const list = await fetchCompanies();
    setCompanies(list || []);
    const id = localStorage.getItem("jsk_active_company") || list?.[0]?.id || "";
    setSelectedId(id);
    if (id) {
      localStorage.setItem("jsk_active_company", id);
      await loadLooms(id);
    }
    setReady(true);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCompany = async () => {
    if (!name.trim()) return setMsg("Enter company name");
    try {
      const c = await upsertCompany({
        name: name.trim(),
        location: location.trim() || "Bhilwara",
        price_per_metre: Number(price) || 15,
        working_days_per_month: 26,
      });
      localStorage.setItem("jsk_active_company", c.id);
      setSelectedId(c.id);
      setName("");
      setMsg(`✅ Saved ${c.name}`);
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveLoom = async () => {
    if (!selectedId) return setMsg("Select company");
    if (!loomNumber.trim()) return setMsg("Enter loom number");
    const { error } = await getSupabase().from("looms").insert({
      company_id: selectedId,
      loom_number: loomNumber.trim(),
      target_per_shift: Number(target) || 500,
    });
    if (error) return setMsg(error.message);
    setLoomNumber("");
    setMsg("✅ Loom added");
    await loadLooms(selectedId);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Checking login…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-[#0F1624] h-14 px-6 flex items-center justify-between">
        <Link href="/" className="text-white font-bold">
          Loomvex
        </Link>
        <Link href="/" className="text-white/70 text-sm">
          Dashboard
        </Link>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Setup</h1>
        {msg && (
          <div className="text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-2">{msg}</div>
        )}

        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold">Add company</h2>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Company name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Price per metre"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <button
            onClick={saveCompany}
            className="px-4 py-2 bg-[#E8820C] text-white rounded-lg text-sm font-semibold"
          >
            Save company
          </button>
        </div>

        {companies.length > 0 && (
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Active company</h2>
            <div className="space-y-2">
              {companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={async () => {
                    setSelectedId(c.id);
                    localStorage.setItem("jsk_active_company", c.id);
                    await loadLooms(c.id);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                    selectedId === c.id ? "border-[#E8820C] bg-orange-50" : "border-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedId && (
          <div className="bg-white border rounded-xl p-5 space-y-3">
            <h2 className="font-semibold">Looms (target m/shift)</h2>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Loom no"
                value={loomNumber}
                onChange={(e) => setLoomNumber(e.target.value)}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <button
              onClick={saveLoom}
              className="px-4 py-2 bg-[#0F1624] text-white rounded-lg text-sm font-semibold"
            >
              Add loom
            </button>
            <ul className="text-sm space-y-1">
              {looms.map((l) => (
                <li key={l.id}>
                  Loom {l.loom_number} · target {l.target_per_shift} m
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}