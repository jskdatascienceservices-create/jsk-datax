import { supabase, isSupabaseConfigured } from "./client";

export type DbCompany = {
  id: string;
  name: string;
  location: string | null;
  owner_name: string | null;
  price_per_metre: number;
  working_days_per_month: number;
};

export type DbProduction = {
  id: string;
  company_id: string;
  production_date: string;
  loom: string;
  shift: string;
  meters: number;
  defect_meters: number;
};

export type DbInventory = {
  id: string;
  company_id: string;
  name: string;
  quantity: number;
  daily_usage: number;
  unit: string;
};

export async function fetchCompanies(): Promise<DbCompany[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("companies", error);
    return [];
  }
  return (data || []) as DbCompany[];
}

export async function fetchProduction(companyId: string): Promise<DbProduction[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("production")
    .select("*")
    .eq("company_id", companyId)
    .order("production_date", { ascending: false });
  if (error) {
    console.error("production", error);
    return [];
  }
  return (data || []) as DbProduction[];
}

export async function fetchInventory(companyId: string): Promise<DbInventory[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("company_id", companyId);
  if (error) {
    console.error("inventory", error);
    return [];
  }
  return (data || []) as DbInventory[];
}

export async function upsertCompany(row: {
  name: string;
  location?: string;
  owner_name?: string;
  price_per_metre?: number;
  working_days_per_month?: number;
}) {
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: row.name,
      location: row.location || null,
      owner_name: row.owner_name || null,
      price_per_metre: row.price_per_metre ?? 15,
      working_days_per_month: row.working_days_per_month ?? 26,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbCompany;
}

export async function insertProductionRows(
  rows: {
    company_id: string;
    production_date: string;
    loom: string;
    shift: string;
    meters: number;
    defect_meters: number;
  }[]
) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("production").insert(rows);
  if (error) throw error;
}

export async function replaceInventory(
  companyId: string,
  rows: { name: string; quantity: number; daily_usage: number; unit: string }[]
) {
  await supabase.from("inventory").delete().eq("company_id", companyId);
  if (rows.length === 0) return;
  const { error } = await supabase.from("inventory").insert(
    rows.map((r) => ({
      company_id: companyId,
      name: r.name,
      quantity: r.quantity,
      daily_usage: r.daily_usage,
      unit: r.unit,
    }))
  );
  if (error) throw error;
}