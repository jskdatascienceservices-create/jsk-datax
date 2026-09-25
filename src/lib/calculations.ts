/**
 * JSK DataX Services - Automatic Calculation Utilities
 */

export function calcDefectRate(defectMeters: number, productionMeters: number): number {
  if (productionMeters <= 0) return 0;
  return Math.round((defectMeters / productionMeters) * 10000) / 100;
}

export function calcAchievementPct(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 1000) / 10;
}

export function calcDaysRemaining(currentQty: number, avgDailyConsumption: number): number {
  if (avgDailyConsumption <= 0) return 999;
  return Math.round((currentQty / avgDailyConsumption) * 10) / 10;
}

export function getStockStatus(daysRemaining: number, reorderLevelDays = 7): "ok" | "warn" | "low" {
  if (daysRemaining <= reorderLevelDays) return "low";
  if (daysRemaining <= reorderLevelDays * 2) return "warn";
  return "ok";
}

export function getDefectStatus(rate: number): "normal" | "watch" | "alert" {
  if (rate >= 8) return "alert";
  if (rate >= 4) return "watch";
  return "normal";
}

export function calcDeltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatINR(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}