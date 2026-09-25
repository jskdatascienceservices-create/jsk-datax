export type UserRole = "owner" | "supervisor" | "viewer";
export type Shift = "morning" | "afternoon" | "night";
export type LoomStatus = "active" | "maintenance" | "inactive";
export type StockStatus = "ok" | "warn" | "low";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type WhatsAppStatus = "pending" | "sent" | "delivered" | "failed";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  mill_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mill {
  id: string;
  name: string;
  location: string | null;
  owner_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Loom {
  id: string;
  mill_id: string;
  loom_number: string;
  status: LoomStatus;
  target_meters_per_shift: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionLog {
  id: string;
  mill_id: string;
  loom_id: string;
  production_date: string;
  shift: Shift;
  meters_produced: number;
  target_meters: number;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Defect {
  id: string;
  mill_id: string;
  loom_id: string;
  production_log_id: string | null;
  defect_date: string;
  shift: Shift;
  defect_meters: number;
  defect_type: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  mill_id: string;
  name: string;
  category: string | null;
  unit: string;
  current_quantity: number;
  avg_daily_consumption: number;
  reorder_level_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevenueEntry {
  id: string;
  mill_id: string;
  entry_date: string;
  amount: number;
  description: string | null;
  customer_name: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  mill_id: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  related_loom_id: string | null;
  related_item_id: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface WhatsAppLog {
  id: string;
  mill_id: string;
  alert_id: string | null;
  phone_number: string;
  message_body: string;
  status: WhatsAppStatus;
  twilio_sid: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface LoomDefectRate {
  loom_id: string;
  mill_id: string;
  loom_number: string;
  report_date: string;
  shift: Shift;
  total_meters: number;
  total_defect_meters: number;
  defect_rate_pct: number;
  status: "normal" | "watch" | "alert" | "no_data";
}

export interface DailyProductionSummary {
  mill_id: string;
  production_date: string;
  shift: Shift;
  total_produced: number;
  total_target: number;
  achievement_pct: number;
}

export interface InventoryDaysRemaining {
  item_id: string;
  mill_id: string;
  name: string;
  category: string | null;
  unit: string;
  current_quantity: number;
  avg_daily_consumption: number;
  days_remaining: number;
  stock_status: StockStatus;
  reorder_level_days: number;
}

export interface MonthlyRevenue {
  mill_id: string;
  month_start: string;
  month_label: string;
  total_revenue: number;
  entry_count: number;
}

export interface DashboardKPIs {
  todayProduction: number;
  todayProductionDelta: number;
  avgDefectRate: number;
  defectRateDelta: number;
  criticalLoomRate: number | null;
  criticalLoomNumber: string | null;
  monthlyRevenue: number;
  monthlyRevenueDelta: number;
  lowestStockDays: number;
  lowestStockItem: string | null;
}