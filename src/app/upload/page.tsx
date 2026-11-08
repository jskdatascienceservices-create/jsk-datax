"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { requireLoggedIn } from "@/lib/supabase/requireAuth";
import { getProfile } from "@/lib/supabase/subscription";
import {
  fetchCompanies,
  upsertCompany,
  type DbCompany,
} from "@/lib/supabase/data";

function parseCSV(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
}

export default function UploadPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
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
      const profile = await getProfile();
      const list = await fetchCompanies();
      setCompanies(list || []);
      const id =
        profile?.company_id ||
        localStorage.getItem("jsk_active_company") ||
        list?.[0]?.id ||
        "";
      if (id) {
        setCompanyId(id);
        localStorage.setItem("jsk_active_company", id);
      }
      setReady(true);
    })();
  }, [router]);

  const onFile = async (file: File, kind: "companies" | "production" | "inventory") => {
    setBusy(true);
    setMsg("");
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV has no data rows");
      const header = rows[0].map((h) => h.toLowerCase());
      const data = rows.slice(1);
      const sb = getSupabase();

      if (kind === "companies") {
        const nameIdx = header.findIndex((h) => h.includes("company") || h === "name");
        const locIdx = header.findIndex((h) => h.includes("location"));
        for (const row of data) {
          const name = row[nameIdx >= 0 ? nameIdx : 0];
          if (!name) continue;
          await upsertCompany({
            name,
            location: locIdx >= 0 ? row[locIdx] || "" : "",
            price_per_metre: 15,
            working_days_per_month: 26,
          });
        }
        const list = await fetchCompanies();
        setCompanies(list || []);
        setMsg(`✅ Companies uploaded (${data.length} rows)`);
      }

      if (kind === "production") {
        if (!companyId) throw new Error("Select a company first");
        const dateIdx = header.findIndex((h) => h.includes("date"));
        const loomIdx = header.findIndex((h) => h.includes("loom"));
        const shiftIdx = header.findIndex((h) => h.includes("shift"));
        const metersIdx = header.findIndex((h) => h.includes("meter") || h.includes("metre"));
        const defectIdx = header.findIndex((h) => h.includes("defect"));

        const inserts = data
          .map((row) => ({
            company_id: companyId,
            production_date: row[dateIdx >= 0 ? dateIdx : 0],
            loom: row[loomIdx >= 0 ? loomIdx : 1],
            shift: (row[shiftIdx >= 0 ? shiftIdx : 2] || "").toLowerCase(),
            meters: Number(row[metersIdx >= 0 ? metersIdx : 3] || 0),
            defect_meters: Number(row[defectIdx >= 0 ? defectIdx : 4] || 0),
          }))
          .filter((r) => r.production_date && r.loom);

        if (inserts.length === 0) throw new Error("No valid production rows");
        const { error } = await sb.from("production").insert(inserts);
        if (error) throw error;
        setMsg(`✅ Production uploaded (${inserts.length} rows)`);
      }

      if (kind === "inventory") {
        if (!companyId) throw new Error("Select a company first");
        const nameIdx = header.findIndex((h) => h.includes("item") || h.includes("name"));
        const qtyIdx = header.findIndex((h) => h.includes("qty") || h.includes("stock") || h.includes("kg"));
        const daysIdx = header.findIndex((h) => h.includes("day"));

        await sb.from("inventory").delete().eq("company_id", companyId);
        const inserts = data
          .map((row) => ({
            company_id: companyId,
            item_name: row[nameIdx >= 0 ? nameIdx : 0],
            quantity: Number(row[qtyIdx >= 0 ? qtyIdx : 1] || 0),
            days_remaining: Number(row[daysIdx >= 0 ? daysIdx : 2] || 0),
          }))
          .filter((r) => r.item_name);

        const { error } = await sb.from("inventory").insert(inserts);
        if (error) throw error;
        setMsg(`✅ Inventory uploaded (${inserts.length} items)`);
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
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

      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#0F1624]">Upload CSV</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Login required. Data goes to Supabase for the selected company.
        </p>

        {msg && (
          <div className="mb-4 text-sm rounded-lg px-3 py-2 bg-amber-50 text-amber-900">
            {msg}
          </div>
        )}

        <div className="mb-6">
          <label className="text-xs text-slate-500">Active company</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              localStorage.setItem("jsk_active_company", e.target.value);
            }}
          >
            <option value="">Select…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {(
          [
            ["companies", "Companies.csv"],
            ["production", "Production.csv (Date, Loom, Shift, Meters, Defect_Meters)"],
            ["inventory", "Inventory.csv (Item, Qty, Days)"],
          ] as const
        ).map(([kind, label]) => (
          <div key={kind} className="mb-4 bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">{label}</div>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f, kind);
              }}
              className="text-sm"
            />
          </div>
        ))}
      </main>
    </div>
  );
}