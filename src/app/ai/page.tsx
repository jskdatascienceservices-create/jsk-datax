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
  canUseAI,
  type PlanId,
} from "@/lib/supabase/subscription";
import { isFounder } from "@/lib/supabase/admin";

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

type DayPoint = { date: string; meters: number; defect: number };

/** Linear regression: y = a + b*x */
function linearTrend(values: number[]) {
  const n = values.length;
  if (n < 2) return { a: values[0] || 0, b: 0 };
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX || 1;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b };
}

function movingAverage(values: number[], window: number) {
  if (values.length === 0) return 0;
  const w = Math.min(window, values.length);
  const slice = values.slice(-w);
  return slice.reduce((s, v) => s + v, 0) / w;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

export default function AIPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [paidMonths, setPaidMonths] = useState(0);
  const [company, setCompany] = useState<DbCompany | null>(null);
  const [production, setProduction] = useState<DbProduction[]>([]);
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
      if (!sub && !isFounder(userEmail)) {
        router.replace("/pricing");
        return;
      }
      const currentPlan = (sub?.plan as PlanId) || null;
      setPlan(currentPlan);
      setPaidMonths(sub?.paid_months || 0);

      if (!canUseAI(currentPlan, sub?.paid_months || 0, userEmail)) {
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

  const price = Number(company?.price_per_metre ?? 15);

  const days: DayPoint[] = useMemo(() => {
    const map = new Map<string, DayPoint>();
    for (const r of production) {
      const d = String((r as any).production_date || (r as any).date || "").slice(0, 10);
      if (!d) continue;
      const meters = Number((r as any).meters ?? 0);
      const defect = Number((r as any).defect_meters ?? 0);
      if (!map.has(d)) map.set(d, { date: d, meters: 0, defect: 0 });
      const row = map.get(d)!;
      row.meters += meters;
      row.defect += defect;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [production]);

  const analysis = useMemo(() => {
    const metersSeries = days.map((d) => d.meters);
    const defectPctSeries = days.map((d) =>
      d.meters > 0 ? (d.defect / d.meters) * 100 : 0
    );

    const ma3 = movingAverage(metersSeries, 3);
    const ma7 = movingAverage(metersSeries, 7);
    const { a, b } = linearTrend(metersSeries);
    const nextDayTrend = Math.max(0, a + b * metersSeries.length);
    const nextWeek = Array.from({ length: 7 }, (_, i) =>
      Math.max(0, a + b * (metersSeries.length + i))
    );
    const weekTotal = nextWeek.reduce((s, v) => s + v, 0);

    const last = metersSeries[metersSeries.length - 1] || 0;
    const prev = metersSeries[metersSeries.length - 2] || last;
    const momChange = prev > 0 ? ((last - prev) / prev) * 100 : 0;

    const defMa = movingAverage(defectPctSeries, 3);
    const defTrend = linearTrend(defectPctSeries).b;
    const sigma = stdDev(metersSeries);
    const mean = metersSeries.length
      ? metersSeries.reduce((s, v) => s + v, 0) / metersSeries.length
      : 0;
    const anomaly =
      metersSeries.length >= 3 && sigma > 0 && Math.abs(last - mean) > 1.5 * sigma;

    // Blend: 60% trend + 40% short MA (simple ensemble)
    const nextDayBlend = Math.max(0, 0.6 * nextDayTrend + 0.4 * ma3);

    let direction: "up" | "down" | "flat" = "flat";
    if (b > mean * 0.02) direction = "up";
    else if (b < -mean * 0.02) direction = "down";

    const insights: string[] = [];
    if (days.length < 3) {
      insights.push(
        "Need at least 3 days of production data for stable forecasts. Keep uploading daily."
      );
    } else {
      if (direction === "up")
        insights.push(
          `Production trend is rising (~${b.toFixed(0)} m/day slope). Maintain current shift discipline.`
        );
      else if (direction === "down")
        insights.push(
          `Production trend is falling (~${Math.abs(b).toFixed(0)} m/day). Check idle looms, yarn supply, and absenteeism.`
        );
      else insights.push("Production is roughly stable day-to-day. Focus on defect reduction for margin.");

      if (defTrend > 0.05)
        insights.push(
          `Defect % is trending up. Inspect Loom with highest recent defects first.`
        );
      else if (defMa < 1.5)
        insights.push(`Defect rate looks controlled (recent avg ~${defMa.toFixed(2)}%).`);
      else
        insights.push(
          `Defect rate around ${defMa.toFixed(2)}%. Target under 1.5% if quality claims matter.`
        );

      if (anomaly)
        insights.push(
          `Latest day looks unusual vs history (possible data entry issue or real disruption). Verify yesterday's entries.`
        );

      insights.push(
        `7-day forecast ≈ ${Math.round(weekTotal).toLocaleString("en-IN")} m → ~${formatINR(
          weekTotal * price
        )} revenue at ₹${price}/m.`
      );
    }

    return {
      ma3,
      ma7,
      nextDayBlend,
      weekTotal,
      momChange,
      defMa,
      direction,
      anomaly,
      insights,
      last,
      mean,
      b,
    };
  }, [days, price]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Running models…
      </div>
    );
  }

  if (!canUseAI(plan, paidMonths, email)) {
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
          <h1 className="text-2xl font-bold mb-2">AI predictions</h1>
          <p className="text-sm text-slate-600 mb-6">
            Ultra plan (₹40k) unlocks after <b>3 months</b> of paid Basic/Advance use.
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
          <Link href="/history" className="text-white/70 hover:text-white">
            History
          </Link>
          <Link href="/reports" className="text-white/70 hover:text-white">
            Reports
          </Link>
          <span className="text-[#E8820C] font-semibold">AI</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#0F1624]">AI insights</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          {company?.name || "Company"} · forecasts from your production history
        </p>

        {msg && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            {msg}
          </div>
        )}

        {/* Forecast KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              t: "Next day (blend)",
              v: `${Math.round(analysis.nextDayBlend).toLocaleString("en-IN")} m`,
            },
            {
              t: "7-day production",
              v: `${Math.round(analysis.weekTotal).toLocaleString("en-IN")} m`,
            },
            {
              t: "7-day revenue",
              v: formatINR(analysis.weekTotal * price),
            },
            {
              t: "Trend",
              v:
                analysis.direction === "up"
                  ? "Rising"
                  : analysis.direction === "down"
                    ? "Falling"
                    : "Stable",
            },
          ].map((k) => (
            <div
              key={k.t}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="text-xs text-slate-500">{k.t}</div>
              <div className="text-lg font-bold text-[#0F1624] mt-1">{k.v}</div>
            </div>
          ))}
        </div>

        {/* Models */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Models used</h2>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>
                • <b>3-day MA</b>: {Math.round(analysis.ma3).toLocaleString("en-IN")} m
              </li>
              <li>
                • <b>7-day MA</b>: {Math.round(analysis.ma7).toLocaleString("en-IN")} m
              </li>
              <li>
                • <b>Linear trend slope</b>: {analysis.b.toFixed(1)} m/day
              </li>
              <li>
                • <b>Ensemble forecast</b>: 60% trend + 40% MA
              </li>
              <li>
                • <b>Defect avg (3d)</b>: {analysis.defMa.toFixed(2)}%
              </li>
              <li>
                • <b>Day-to-day change</b>: {analysis.momChange.toFixed(1)}%
              </li>
            </ul>
          </div>
          <div className="bg-[#0F1624] rounded-xl p-5 text-white">
            <h2 className="text-sm font-semibold text-[#E8820C] mb-3">
              Analyst summary
            </h2>
            <ul className="text-sm text-white/80 space-y-3">
              {analysis.insights.map((t, i) => (
                <li key={i}>• {t}</li>
              ))}
            </ul>
            {analysis.anomaly && (
              <p className="mt-4 text-xs text-amber-300">
                Anomaly flag: last day is far from historical average.
              </p>
            )}
          </div>
        </div>

        {/* Recent series */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Recent daily production</h2>
          {days.length === 0 ? (
            <p className="text-sm text-slate-500">Upload data to train forecasts.</p>
          ) : (
            <div className="space-y-2">
              {days.slice(-14).map((d) => {
                const max = Math.max(...days.map((x) => x.meters), 1);
                const w = Math.round((d.meters / max) * 100);
                return (
                  <div key={d.date} className="flex items-center gap-3 text-xs">
                    <span className="w-24 text-slate-500 shrink-0">{d.date}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E8820C] rounded-full"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-medium">
                      {d.meters.toLocaleString("en-IN")} m
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4">
            More history → more stable MA and trend. This is classical ML-style forecasting,
            not a neural net — fast, explainable, good for SME mill data.
          </p>
        </div>
      </main>
    </div>
  );
}