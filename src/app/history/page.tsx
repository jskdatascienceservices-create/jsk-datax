"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchProduction,
  fetchCompanies,
  type DbProduction,
  type DbCompany,
} from "@/lib/supabase/data";
import {
  getProfile,
  getActiveSubscription,
  canUseHistory,
  type PlanId,
} from "@/lib/supabase/subscription";

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

type DayRow = {
  date: string;
  meters: number;
  defect: number;
  rows: DbProduction[];
};

export default function HistoryPage() {
  const router = useRouter();

  // --- these are the useState lines ---
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState<DbCompany | null>(null);
  const [production, setProduction] = useState<DbProduction[]>([]);
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured()) {
        setMsg("Supabase not configured");
        setLoading(false);
        return;
      }

      const profile = await getProfile();
      if (!profile) {
        router.replace("/login");
        return;
      }

      const userEmail = profile.email || "";
      setEmail(userEmail);

      const companyId =
        profile.company_id || localStorage.getItem("jsk_active_company") || "";
      if (!companyId) {
        setMsg("No company linked");
        setLoading(false);
        return;
      }
      localStorage.setItem("jsk_active_company", companyId);

      const sub = await getActiveSubscription(companyId);

      // Founder can open history without a plan; others need active plan
      if (!sub) {
        const { isFounder } = await import("@/lib/supabase/admin");
        if (!isFounder(userEmail)) {
          router.replace("/pricing");
          return;
        }
      } else {
        setPlan(sub.plan as PlanId);
      }

      const currentPlan = (sub?.plan as PlanId) || null;
      if (!canUseHistory(currentPlan, userEmail)) {
        setPlan(currentPlan);
        setLoading(false);
        return;
      }

      const companies = await fetchCompanies();
      setCompany(companies.find((c) => c.id === companyId) || null);

      const prod = await fetchProduction(companyId);
      setProduction(prod || []);
      setLoading(false);
    })();
  }, [router]);

  const days: DayRow[] = useMemo(() => {
    const map = new Map<string, DayRow>();
    for (const r of production) {
      const d = String((r as any).production_date || (r as any).date || "").slice(0, 10);
      if (!d) continue;
      const meters = Number((r as any).meters ?? 0);
      const defect = Number((r as any).defect_meters ?? 0);
      if (!map.has(d)) map.set(d, { date: d, meters: 0, defect: 0, rows: [] });
      const row = map.get(d)!;
      row.meters += meters;
      row.defect += defect;
      row.rows.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [production]);

  const price = Number(company?.price_per_metre ?? 15);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading history…
      </div>
    );
  }

  if (plan && !canUseHistory(plan, email)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <nav className="bg-[#0F1624] h-14 px-6 flex items-center justify-between">
          <Link href="/" className="text-white font-bold">
            Loomvex
          </Link>
          <Link href="/pricing" className="text-[#E8820C] text-sm font-semibold">
            Upgrade
          </Link>
        </nav>
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Performance history</h1>
          <p className="text-sm text-slate-600 mb-6">
            Included in Advance (₹20k) and Ultra plans.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2.5 bg-[#E8820C] text-white rounded-lg text-sm font-semibold"
          >
            View plans
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-[#0F1624] h-14 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#E8820C] rounded-lg flex items-center justify-center text-white text-xs font-extrabold">
            L
          </div>
          <span className="text-white font-bold text-sm">Loomvex</span>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-white/70 hover:text-white">
            Dashboard
          </Link>
          <span className="text-[#E8820C] font-semibold">History</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#0F1624]">Performance history</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          {company?.name || "Your company"} · past production by day
        </p>

        {msg && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            {msg}
          </div>
        )}

        {days.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
            No production data yet. Upload CSV from the Upload page.
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((d) => {
              const defectPct = d.meters > 0 ? (d.defect / d.meters) * 100 : 0;
              const revenue = d.meters * price;
              const open = selected === d.date;
              return (
                <div
                  key={d.date}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setSelected(open ? null : d.date)}
                    className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-semibold text-[#0F1624]">
                        {new Date(d.date + "T12:00:00").toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {d.rows.length} entries · {d.meters.toLocaleString("en-IN")} m
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{formatINR(revenue)}</div>
                      <div className="text-xs text-slate-500">
                        Defect {defectPct.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 px-4 py-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-400">
                            <th className="py-1 pr-3">Loom</th>
                            <th className="py-1 pr-3">Shift</th>
                            <th className="py-1 pr-3">Metres</th>
                            <th className="py-1">Defect m</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.rows.map((r, i) => (
                            <tr key={i} className="border-t border-slate-50">
                              <td className="py-1.5 pr-3">{(r as any).loom}</td>
                              <td className="py-1.5 pr-3 capitalize">{(r as any).shift}</td>
                              <td className="py-1.5 pr-3">{Number((r as any).meters)}</td>
                              <td className="py-1.5">{Number((r as any).defect_meters)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}