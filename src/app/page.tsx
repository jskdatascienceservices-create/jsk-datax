"use client";

import { useState, useEffect } from "react";
import {
  calcDefectRate,
  calcAchievementPct,
  calcDaysRemaining,
  getStockStatus,
  getDefectStatus,
  formatINR,
  formatNumber,
} from "@/lib/calculations";
import {
  fetchCompanies,
  fetchProduction,
  fetchInventory,
  type DbCompany,
} from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [company, setCompany] = useState<DbCompany | null>(null);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [error, setError] = useState("");

  const [loomRows, setLoomRows] = useState<
    { loom: string; shift: string; meters: number; rate: number; status: "normal" | "watch" | "alert" }[]
  >([]);
  const [shiftTotals, setShiftTotals] = useState({ morning: 0, afternoon: 0, night: 0 });
  const [totalMeters, setTotalMeters] = useState(0);
  const [avgDefect, setAvgDefect] = useState(0);
  const [criticalLoom, setCriticalLoom] = useState<{ loom: string; rate: number } | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [inventoryItems, setInventoryItems] = useState<
    { name: string; quantity: number; unit: string; days: number; status: "ok" | "warn" | "low"; icon: string }[]
  >([]);
  const [insights, setInsights] = useState<{ type: "critical" | "warning" | "success"; text: string }[]>([]);

  const load = async (companyId?: string) => {
    setLoading(true);
    setError("");
    try {
      if (!isSupabaseConfigured()) {
        setError("Supabase not configured. Check .env.local / Vercel env vars.");
        setLoading(false);
        return;
      }

      const list = await fetchCompanies();
      setCompanies(list);

      if (list.length === 0) {
        setCompany(null);
        setLoomRows([]);
        setTotalMeters(0);
        setRevenue(0);
        setInventoryItems([]);
        setLoading(false);
        setAnimated(true);
        return;
      }

      const activeId = companyId || localStorage.getItem("jsk_active_company") || list[0].id;
      const active = list.find((c) => c.id === activeId) || list[0];
      setCompany(active);
      localStorage.setItem("jsk_active_company", active.id);

      const [prod, inv] = await Promise.all([
        fetchProduction(active.id),
        fetchInventory(active.id),
      ]);

      const price = Number(active.price_per_metre) || 15;

      const rows = prod.map((p) => {
        const rate = calcDefectRate(Number(p.defect_meters), Number(p.meters));
        return {
          loom: p.loom,
          shift: p.shift,
          meters: Number(p.meters),
          rate,
          status: getDefectStatus(rate),
        };
      });
      const shiftOrder = { morning: 0, afternoon: 1, night: 2 };
      rows.sort((a, b) => {
        if (a.loom !== b.loom) return a.loom.localeCompare(b.loom);
        return (shiftOrder[a.shift as keyof typeof shiftOrder] ?? 0) - (shiftOrder[b.shift as keyof typeof shiftOrder] ?? 0);
      });
      setLoomRows(rows);

      const shifts = { morning: 0, afternoon: 0, night: 0 };
      prod.forEach((p) => {
        const s = p.shift as keyof typeof shifts;
        if (shifts[s] !== undefined) shifts[s] += Number(p.meters);
      });
      setShiftTotals(shifts);

      const totalM = prod.reduce((s, p) => s + Number(p.meters), 0);
      const totalD = prod.reduce((s, p) => s + Number(p.defect_meters), 0);
      setTotalMeters(totalM);
      setAvgDefect(totalM > 0 ? calcDefectRate(totalD, totalM) : 0);
      setRevenue(totalM * price);

      if (rows.length > 0) {
        const worst = [...rows].sort((a, b) => b.rate - a.rate)[0];
        setCriticalLoom({ loom: worst.loom, rate: worst.rate });
      } else {
        setCriticalLoom(null);
      }

      const invDisplay = inv.map((item, idx) => {
        const days = calcDaysRemaining(Number(item.quantity), Number(item.daily_usage));
        return {
          name: item.name,
          quantity: Number(item.quantity),
          unit: item.unit || "kg",
          days,
          status: getStockStatus(days),
          icon: ["🧵", "🧶", "🔵", "🪡", "🛢️"][idx % 5],
        };
      });
      setInventoryItems(invDisplay);

      const ins: { type: "critical" | "warning" | "success"; text: string }[] = [];
      if (rows.some((r) => r.status === "alert")) {
        ins.push({
          type: "critical",
          text: `High defect on Loom ${rows.filter((r) => r.status === "alert").map((r) => r.loom).join(", ")}.`,
        });
      }
      const low = invDisplay.filter((i) => i.status === "low");
      if (low.length) {
        ins.push({
          type: "warning",
          text: `Low stock: ${low.map((i) => i.name).join(", ")}.`,
        });
      }
      if (totalM > 0) {
        ins.push({
          type: "success",
          text: `${formatNumber(totalM)} m × ₹${price} = ${formatINR(totalM * price)}`,
        });
      }
      setInsights(ins.length ? ins : [{ type: "success", text: "No data yet. Upload CSV or insert data." }]);
    } catch (e) {
      console.error(e);
      setError("Failed to load from Supabase. Check tables, RLS policies, and env keys.");
    }
    setLoading(false);
    setAnimated(true);
    setTimeout(() => setShowToast(true), 1500);
  };

  useEffect(() => {
    load();
  }, []);

  const lowestStock =
    inventoryItems.length > 0
      ? inventoryItems.reduce((min, i) => (i.days < min.days ? i : min))
      : null;
  const target = 500;

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-ink h-14 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-saffron rounded-lg flex items-center justify-center text-white text-xs font-extrabold">
            J
          </div>
          <span className="text-white font-bold text-sm">JSK DataX Services</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {companies.length > 1 && (
            <select
              className="text-xs bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1.5"
              value={company?.id || ""}
              onChange={(e) => load(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="text-ink">
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <a href="/upload" className="text-sm font-semibold px-3 py-1.5 bg-white/10 text-white rounded-lg">
            Upload
          </a>
          <a href="/setup" className="text-sm font-semibold px-3 py-1.5 bg-white/10 text-white rounded-lg">
            Setup
          </a>
          <a href="/share" className="text-sm font-semibold px-3 py-1.5 bg-saffron text-white rounded-lg">
            Share
          </a>
          <a
  href="/login"
  className="text-sm font-semibold px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20"
>
  Login
</a>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-ink to-ink-2 px-6 py-5 border-b-2 border-saffron">
        <div className="text-[10px] font-semibold tracking-widest text-saffron uppercase mb-1">
          Cloud dashboard · Supabase
        </div>
        <h1 className="text-xl font-bold text-white">
          {loading ? "Loading…" : company ? company.name : "No company in database"}
        </h1>
        <p className="text-sm text-white/50 mt-1">
          {company
            ? `${company.location || ""} · ₹${company.price_per_metre}/metre · Revenue = metres × price`
            : "Upload Companies + Production CSV to Supabase"}
        </p>
      </div>

      <main className="px-6 py-6 max-w-[1280px] mx-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <KPI label="Production" value={formatNumber(totalMeters)} sub="metres" accent="bg-saffron" barColor="bg-saffron" bar={60} animated={animated} />
          <KPI label="Avg Defect" value={`${avgDefect}%`} sub="auto" accent="bg-green-600" barColor="bg-green-600" bar={Math.min(avgDefect * 8, 100)} animated={animated} />
          <KPI
            label={criticalLoom ? `Loom ${criticalLoom.loom}` : "Loom Alert"}
            value={criticalLoom ? `${criticalLoom.rate}%` : "—"}
            valueColor="text-red-600"
            sub="highest defect"
            accent="bg-red-600"
            barColor="bg-red-600"
            bar={criticalLoom ? Math.min(criticalLoom.rate * 8, 100) : 0}
            animated={animated}
          />
          <KPI label="Revenue" value={formatINR(revenue)} sub="metres × price" accent="bg-indigo" barColor="bg-indigo" bar={70} animated={animated} />
          <KPI
            label="Lowest stock"
            value={lowestStock ? `${lowestStock.days} d` : "—"}
            valueColor="text-amber-600"
            sub={lowestStock?.name || "—"}
            accent="bg-amber-600"
            barColor="bg-amber-600"
            bar={lowestStock ? Math.min(lowestStock.days * 3, 100) : 0}
            animated={animated}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 mb-4">
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="text-sm font-semibold mb-3">Loom × Shift</div>
            {loomRows.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">
                No production in Supabase. <a href="/upload" className="text-saffron underline">Upload CSV</a>
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[10px] uppercase text-muted">
                    <th className="py-1">Loom</th>
                    <th>Shift</th>
                    <th>Metres</th>
                    <th>Defect %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loomRows.map((r, i) => (
                    <tr key={i} className={`border-b border-border/50 ${r.status === "alert" ? "bg-red-50" : ""}`}>
                      <td className="py-2 font-semibold">Loom {r.loom}</td>
                      <td className="capitalize">{r.shift}</td>
                      <td>{r.meters}</td>
                      <td className={r.status === "alert" ? "text-red-600 font-semibold" : ""}>{r.rate}%</td>
                      <td>{r.status === "alert" ? "🚨" : r.status === "watch" ? "Watch" : "OK"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white border border-border rounded-xl p-5">
            <div className="text-sm font-semibold mb-3">Shift totals</div>
            {(["morning", "afternoon", "night"] as const).map((s) => (
              <div key={s} className="flex items-center gap-2 mb-2">
                <span className="text-xs capitalize w-16 text-muted">{s}</span>
                <div className="flex-1 h-5 bg-surface rounded overflow-hidden">
                  <div
                    className={`h-full text-[10px] text-white flex items-center pl-1 ${
                      s === "morning" ? "bg-green-600" : s === "afternoon" ? "bg-saffron" : "bg-indigo"
                    }`}
                    style={{ width: animated ? `${Math.min(calcAchievementPct(shiftTotals[s], target), 100)}%` : "0%" }}
                  >
                    {calcAchievementPct(shiftTotals[s], target)}%
                  </div>
                </div>
                <span className="text-xs font-mono w-14 text-right">{shiftTotals[s]} m</span>
              </div>
            ))}
            <div className="border-t mt-4 pt-3 text-xs text-muted">
              Total {formatNumber(totalMeters)} m × ₹{company?.price_per_metre ?? 15} ={" "}
              <span className="text-saffron font-bold text-sm">{formatINR(revenue)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-ink to-ink-2 rounded-xl p-5 text-white">
            <div className="font-bold mb-3">AI Insights</div>
            {insights.map((ins, i) => (
              <div key={i} className="text-sm text-white/80 mb-2 flex gap-2">
                <span>{ins.type === "critical" ? "🔴" : ins.type === "warning" ? "🟡" : "🟢"}</span>
                {ins.text}
              </div>
            ))}
          </div>
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="font-semibold text-sm mb-3">Inventory</div>
            {inventoryItems.length === 0 ? (
              <p className="text-sm text-muted">No inventory in Supabase</p>
            ) : (
              inventoryItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border/50">
                  <span>{item.icon} {item.name}</span>
                  <span className={item.status === "low" ? "text-red-600 font-semibold" : "text-green-600"}>
                    {item.days} days
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-ink border border-saffron rounded-xl p-3 max-w-xs text-white text-sm">
          <button className="absolute top-2 right-2 text-white/40" onClick={() => setShowToast(false)}>✕</button>
          Dashboard loaded from Supabase
        </div>
      )}
    </div>
  );
}

function KPI({
  label, value, sub, accent, barColor, bar, animated, valueColor = "text-ink",
}: {
  label: string; value: string; sub: string; accent: string; barColor: string; bar: number; animated: boolean; valueColor?: string;
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-3 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent}`} />
      <div className="text-[10px] text-muted">{label}</div>
      <div className={`text-xl font-bold font-mono ${valueColor}`}>{value}</div>
      <div className="text-[10px] text-muted">{sub}</div>
      <div className="h-1 bg-border rounded mt-2 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: animated ? `${bar}%` : 0 }} />
      </div>
    </div>
  );
}