import type {
  LoomDefectRate,
  DailyProductionSummary,
  InventoryDaysRemaining,
  MonthlyRevenue,
  DashboardKPIs,
} from "@/types/database";
import {
  calcDefectRate,
  calcAchievementPct,
  calcDaysRemaining,
  getStockStatus,
  getDefectStatus,
  calcDeltaPct,
  formatINR,
} from "./calculations";

const rawLoomData = [
  { loom: "01", shift: "morning" as const, produced: 420, defect: 7.56 },
  { loom: "03", shift: "morning" as const, produced: 398, defect: 9.55 },
  { loom: "05", shift: "night" as const, produced: 380, defect: 18.24 },
  { loom: "07", shift: "night" as const, produced: 290, defect: 32.48 },
  { loom: "09", shift: "morning" as const, produced: 412, defect: 8.65 },
  { loom: "11", shift: "night" as const, produced: 356, defect: 10.32 },
];

export const loomDefectRates: LoomDefectRate[] = rawLoomData.map((row) => {
  const rate = calcDefectRate(row.defect, row.produced);
  return {
    loom_id: `loom-${row.loom}`,
    mill_id: "mill-sharma",
    loom_number: `Loom ${row.loom}`,
    report_date: new Date().toISOString().slice(0, 10),
    shift: row.shift,
    total_meters: row.produced,
    total_defect_meters: row.defect,
    defect_rate_pct: rate,
    status: getDefectStatus(rate),
  };
});

const shiftTargets = { morning: 500, afternoon: 500, night: 500 };
const shiftActuals = { morning: 440, afternoon: 480, night: 362 };

export const productionByShift: DailyProductionSummary[] = (
  Object.keys(shiftActuals) as Array<keyof typeof shiftActuals>
).map((shift) => ({
  mill_id: "mill-sharma",
  production_date: new Date().toISOString().slice(0, 10),
  shift,
  total_produced: shiftActuals[shift],
  total_target: shiftTargets[shift],
  achievement_pct: calcAchievementPct(shiftActuals[shift], shiftTargets[shift]),
}));

const rawInventory = [
  { name: "Grey Cotton Yarn", category: "yarn", unit: "kg", qty: 480, daily: 26.7, sub: "2/60s count · 480 kg remaining" },
  { name: "Grey Cloth (Greige)", category: "cloth", unit: "mtrs", qty: 2400, daily: 400, sub: "Ready for processing · 2,400 mtrs" },
  { name: "Sizing Chemical", category: "chemical", unit: "kg", qty: 180, daily: 16.4, sub: "Starch mix · 180 kg" },
  { name: "Polyester Yarn", category: "yarn", unit: "kg", qty: 820, daily: 34.2, sub: "75D · 820 kg remaining" },
  { name: "Loom Oil", category: "oil", unit: "ltrs", qty: 60, daily: 2, sub: "Industrial grade · 60 ltrs" },
];

export const inventoryItems: (InventoryDaysRemaining & { subtitle: string; icon: string })[] =
  rawInventory.map((item, idx) => {
    const days = calcDaysRemaining(item.qty, item.daily);
    return {
      item_id: `inv-${idx}`,
      mill_id: "mill-sharma",
      name: item.name,
      category: item.category,
      unit: item.unit,
      current_quantity: item.qty,
      avg_daily_consumption: item.daily,
      days_remaining: days,
      stock_status: getStockStatus(days),
      reorder_level_days: 7,
      subtitle: item.sub,
      icon: ["🧵", "🧶", "🔵", "🪡", "🛢️"][idx],
    };
  });

export const monthlyRevenue: MonthlyRevenue[] = [
  { mill_id: "mill-sharma", month_start: "2026-04-01", month_label: "Apr", total_revenue: 1210000, entry_count: 18 },
  { mill_id: "mill-sharma", month_start: "2026-05-01", month_label: "May", total_revenue: 1340000, entry_count: 21 },
  { mill_id: "mill-sharma", month_start: "2026-06-01", month_label: "Jun", total_revenue: 1180000, entry_count: 16 },
  { mill_id: "mill-sharma", month_start: "2026-07-01", month_label: "Jul", total_revenue: 1420000, entry_count: 22 },
  { mill_id: "mill-sharma", month_start: "2026-08-01", month_label: "Aug", total_revenue: 1560000, entry_count: 24 },
  { mill_id: "mill-sharma", month_start: "2026-09-01", month_label: "Sep", total_revenue: 1840000, entry_count: 27 },
];

const todayTotal = rawLoomData.reduce((s, r) => s + r.produced, 0);
const yesterdayTotal = Math.round(todayTotal / 1.084);
const totalDefects = rawLoomData.reduce((s, r) => s + r.defect, 0);
const avgDefect = calcDefectRate(totalDefects, todayTotal);
const critical = loomDefectRates.find((l) => l.status === "alert");
const lowestStock = inventoryItems.reduce((min, item) =>
  item.days_remaining < min.days_remaining ? item : min
);

export const dashboardKPIs: DashboardKPIs = {
  todayProduction: todayTotal,
  todayProductionDelta: calcDeltaPct(todayTotal, yesterdayTotal),
  avgDefectRate: avgDefect,
  defectRateDelta: -0.6,
  criticalLoomRate: critical?.defect_rate_pct ?? null,
  criticalLoomNumber: critical?.loom_number ?? null,
  monthlyRevenue: 1840000,
  monthlyRevenueDelta: calcDeltaPct(1840000, 1560000),
  lowestStockDays: lowestStock.days_remaining,
  lowestStockItem: lowestStock.name,
};

export const aiInsights = [
  {
    type: "critical" as const,
    text: `Loom 7 critical: Defect rate ${critical?.defect_rate_pct}% — 3× above mill average. Pattern matches needle wear from last 3 shifts. Recommend immediate inspection before next shift.`,
  },
  {
    type: "warning" as const,
    text: `Grey cloth stock low: Current stock lasts ${lowestStock.days_remaining} days at current consumption. Place reorder by Thursday to avoid production stoppage next week.`,
  },
  {
    type: "success" as const,
    text: `Revenue milestone: September on track to be best month in 8 months at ${formatINR(1840000)}. Morning shift is top performer — consider scheduling high-value orders in morning slots.`,
  },
  {
    type: "warning" as const,
    text: `Night shift gap: Night shift consistently 28% below target for 3 weeks. Possible supervisor change or equipment issue. Needs attention.`,
  },
];

export const millInfo = {
  name: "Sharma Textiles",
  location: "Bhilwara, Rajasthan",
  company: "JSK DataX Services",
};