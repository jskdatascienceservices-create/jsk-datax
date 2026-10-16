"use client";

import { getSupabase, isSupabaseConfigured } from "./client";

export type PlanId = "basic" | "advance" | "ultra";

export const PLANS = {
  basic: {
    id: "basic" as const,
    name: "Basic",
    price: 10000,
    label: "₹10,000 / month",
    features: ["Dashboard", "CSV upload", "Share report", "1 company"],
  },
  advance: {
    id: "advance" as const,
    name: "Advance",
    price: 20000,
    label: "₹20,000 / month",
    features: ["Everything in Basic", "Performance history", "Day / month / year reports", "Charts & KPIs"],
  },
  ultra: {
    id: "ultra" as const,
    name: "Ultra (AI)",
    price: 40000,
    label: "₹40,000 / month",
    features: ["Everything in Advance", "AI predictions", "Data-scientist style insights"],
    requiresMonths: 3,
  },
};

export type SubRow = {
  id: string;
  company_id: string;
  plan: PlanId;
  status: string;
  price_inr: number;
  starts_at: string | null;
  ends_at: string | null;
  paid_months: number;
};

export async function getProfile() {
  if (!isSupabaseConfigured()) return null;
  const { data: { user } } = await getSupabase().auth.getUser();
  if (!user) return null;
  const { data } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data ? { ...data, email: user.email } : { id: user.id, email: user.email, company_id: null };
}

export async function getActiveSubscription(companyId: string): Promise<SubRow | null> {
  if (!companyId) return null;
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  // expired?
  if (data.ends_at && new Date(data.ends_at) < new Date()) {
    await getSupabase().from("subscriptions").update({ status: "expired" }).eq("id", data.id);
    return null;
  }
  return data as SubRow;
}

export function canUseHistory(plan: PlanId | null) {
  return plan === "advance" || plan === "ultra";
}

export function canUseReports(plan: PlanId | null) {
  return plan === "advance" || plan === "ultra";
}

export function canUseAI(plan: PlanId | null, paidMonths: number) {
  return plan === "ultra" && paidMonths >= 3;
}

/** Activate plan for 30 days (test mode — replace with Razorpay later) */
export async function activatePlan(companyId: string, plan: PlanId, previousPaidMonths = 0) {
  const price = PLANS[plan].price;
  const starts = new Date();
  const ends = new Date();
  ends.setDate(ends.getDate() + 30);

  // expire old active
  await getSupabase()
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("company_id", companyId)
    .eq("status", "active");

  const { data, error } = await getSupabase()
    .from("subscriptions")
    .insert({
      company_id: companyId,
      plan,
      status: "active",
      price_inr: price,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      paid_months: previousPaidMonths + 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SubRow;
}