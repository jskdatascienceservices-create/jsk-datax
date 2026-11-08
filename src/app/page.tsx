"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase/client";
import {
  fetchCompanies,
  fetchProduction,
  type DbCompany,
  type DbProduction,
} from "@/lib/supabase/data";
import { requireLoggedIn } from "@/lib/supabase/requireAuth";
import { getProfile } from "@/lib/supabase/subscription";
import { isFounder } from "@/lib/supabase/admin";

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function defectPct(meters: number, defect: number) {
  if (meters <= 0) return 0;
  return (defect / meters) * 100;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [production, setProduction] = useState<DbProduction[]>([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");

    // --- must be logged in ---
    const auth = await requireLoggedIn();
    if (!auth.ok) {
      router.replace("/login");
      return;
    }
    setEmail(auth.email);

    if (!isSupabaseConfigured()) {
      setMsg("Supabase not configured");
      setLoading(false);
      return;
    }

    try {
      const profile = await getProfile();
      const list = await fetchCompanies();
      setCompanies(list || []);

      let active =
        profile?.company_id ||
        localStorage.getItem("jsk_active_company") ||
        list?.[0]?.id ||
        "";

      if (active && list?.some((c) => c.id === active)) {
        localStorage.setItem("jsk_active_company", active);
      } else {
        active = list?.[0]?.id || "";
        if (active) localStorage.setItem("jsk_active_company", active);
      }

      setCompanyId(active);

      if (active) {
        const prod = await fetchProduction(active);
        setProduction(prod || []);
      } else {
        setProduction([]);
        setMsg("No company linked. Complete Sign up or Setup.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load";
      setMsg(message);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const company = companies.find((c) => c.id === companyId) || null;
  const price = Number(company?.price_per_metre ?? 15);
  const target = 500;

  const rows = useMemo(() => {
    return (production || []).map((r) => {
      const meters = Number((r as any).meters ?? 0);
      const defect = Number((r as any).defect_meters ?? 0);
      const pct = defectPct(meters, defect);
      return {
        loom: String((r as any).loom ?? ""),
        shift: String((r as any).shift ?? ""),
        meters,
        defect,
        pct,
        status: pct <= 3 ? "OK" : "HIGH",
      };
    });
  }, [production]);

  const totals = useMemo(() => {
    const meters = rows.reduce((s, r) => s + r.meters, 0);
    const defect = rows.reduce((s, r) => s + r.defect, 0);
    const byShift: Record<string, number> = {};
    for (const r of rows) {
      const k = r.shift || "—";
      byShift[k] = (byShift[k] || 0) + r.meters;
    }
    const worst = rows.reduce(
      (w, r) => (r.pct > (w?.pct || 0) ? r : w),
      null as null | (typeof rows)[0]
    );
    return {
      meters,
      defect,
      avgPct: defectPct(meters, defect),
      revenue: meters * price,
      byShift,
      worst,
    };
  }, [rows, price]);

  const onSelectCompany = async (id: string) => {
    setCompanyId(id);
    localStorage.setItem("jsk_active_company", id);
    setLoading(true);
    const prod = await fetchProduction(id);
    setProduction(prod || []);
    setLoading(false);
  };

  const logout = async () => {
    await getSupabase().auth.signOut();
    localStorage.removeItem("jsk_active_company");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-500 text-sm">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-[#0F1624] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E8820C] rounded-lg flex items-center justify-center text-white text-sm font-extrabold">
            L
          </div>
          <div>
            <div className="text-white font-bold text-sm">Loomvex</div>
            <div className="text-[10px] text-white/50">
              {isFounder(email) ? "Founder" : "Cloud dashboard"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {companies.length > 0 && (
            <select
              value={companyId}
              onChange={(e) => onSelectCompany(e.target.value)}
              className="bg-white/10 text-white text-xs rounded-lg px-2 py-1.5 border border-white/20"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="text-black">
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <Link href="/upload" className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white">
            Upload
          </Link>
          <Link href="/setup" className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white">
            Setup
          </Link>
          <Link href="/share" className="px-3 py-1.5 rounded-lg bg-[#E8820C] text-white font-semibold">
            Share
          </Link>
          <Link href="/history" className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white">
            History
          </Link>
          <Link href="/reports" className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white">
            Reports
          </Link>
          <Link href="/ai" className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white">
            AI
          </Link>
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold"
          >
            Log out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-xs font-semibold tracking-widest text-[#E8820C] uppercase mb-1">
          Cloud dashboard · Supabase
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F1624]">
          {company?.name || "No company"}
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          {company?.location || "—"} · ₹{price}/metre · Revenue = metres × price
        </p>

        {msg && (
          <div className="mb-4 text-sm text-amber-900 bg-amber-50 rounded-lg px-3 py-2">
            {msg}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            {
              t: "Production",
              v: totals.meters.toLocaleString("en-IN"),
              s: "metres",
              color: "border-t-[#E8820C]",
            },
            {
              t: "Avg Defect",
              v: `${totals.avgPct.toFixed(2)}%`,
              s: "auto",
              color: "border-t-emerald-500",
            },
            {
              t: totals.worst ? `Loom ${totals.worst.loom}` : "Highest defect",
              v: totals.worst ? `${totals.worst.pct.toFixed(2)}%` : "—",
              s: "highest defect",
              color: "border-t-red-500",
            },
            {
              t: "Revenue",
              v: formatINR(totals.revenue),
              s: "metres × price",
              color: "border-t-blue-500",
            },
          ].map((k) => (
            <div
              key={k.t}
              className={`bg-white border border-slate-200 rounded-xl p-4 border-t-4 ${k.color}`}
            >
              <div className="text-xs text-slate-500">{k.t}</div>
              <div className="text-2xl font-bold text-[#0F1624] mt-1">{k.v}</div>
              <div className="text-xs text-slate-400 mt-1">{k.s}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Loom × Shift */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
            <h2 className="font-semibold text-[#0F1624] mb-3">Loom × Shift</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">
                No production rows. Use Upload to add CSV.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-2">Loom</th>
                    <th className="py-2 pr-2">Shift</th>
                    <th className="py-2 pr-2">Metres</th>
                    <th className="py-2 pr-2">Defect %</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="py-2 pr-2 font-medium">Loom {r.loom}</td>
                      <td className="py-2 pr-2 capitalize">{r.shift}</td>
                      <td className="py-2 pr-2">{r.meters}</td>
                      <td className="py-2 pr-2">{r.pct.toFixed(2)}%</td>
                      <td className="py-2">
                        <span
                          className={
                            r.status === "OK" ? "text-emerald-600" : "text-red-600"
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Shift totals */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-[#0F1624] mb-3">Shift totals</h2>
            <div className="space-y-3">
              {Object.keys(totals.byShift).length === 0 && (
                <p className="text-sm text-slate-500">No shifts yet.</p>
              )}
              {Object.entries(totals.byShift).map(([shift, m]) => {
                const pct =
                  totals.meters > 0 ? Math.round((m / totals.meters) * 100) : 0;
                return (
                  <div key={shift}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-slate-600">{shift}</span>
                      <span className="font-medium">{m.toLocaleString("en-IN")} m</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Total {totals.meters.toLocaleString("en-IN")} m × ₹{price} ={" "}
              <span className="font-semibold text-[#E8820C]">
                {formatINR(totals.revenue)}
              </span>
            </p>
            <p className="text-[10px] text-slate-400 mt-2">
              Target ref: {target} m / shift (loom setup)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}