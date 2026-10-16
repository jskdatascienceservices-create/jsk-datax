"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PLANS,
  PlanId,
  getProfile,
  getActiveSubscription,
  activatePlan,
  SubRow,
} from "@/lib/supabase/subscription";

export default function PricingPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [sub, setSub] = useState<SubRow | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      if (!profile) {
        router.replace("/login");
        return;
      }
      if (!profile.company_id) {
        setMsg("No company linked. Sign up again.");
        setReady(true);
        return;
      }
      setCompanyId(profile.company_id);
      localStorage.setItem("jsk_active_company", profile.company_id);
      const s = await getActiveSubscription(profile.company_id);
      setSub(s);
      setReady(true);
    })();
  }, [router]);

  const pay = async (plan: PlanId) => {
    if (!companyId) return;
    if (plan === "ultra") {
      const months = sub?.paid_months || 0;
      if (months < 3) {
        setMsg("Ultra unlocks after 3 months of paid Basic or Advance use.");
        return;
      }
    }
    setBusy(true);
    setMsg("");
    try {
      const prev = sub?.paid_months || 0;
      const next = await activatePlan(companyId, plan, prev);
      setSub(next);
      setMsg(`✅ ${PLANS[plan].name} active for 30 days. Redirecting…`);
      setTimeout(() => router.push("/"), 1200);
    } catch (e: any) {
      setMsg(e?.message || "Payment activation failed");
    }
    setBusy(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-[#0F1624] h-14 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E8820C] rounded-lg flex items-center justify-center text-white font-extrabold text-sm">
            L
          </div>
          <span className="text-white font-bold">Loomvex</span>
        </div>
        <Link href="/login" className="text-white/70 text-sm">
          Account
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-[#0F1624] text-center">Choose your plan</h1>
        <p className="text-sm text-slate-500 text-center mt-2 mb-8">
          Company access only after payment. No free use of the product.
        </p>

        {sub && (
          <div className="mb-6 text-center text-sm bg-green-50 text-green-800 rounded-lg py-2">
            Active: <b>{PLANS[sub.plan as PlanId]?.name}</b> · ends{" "}
            {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString("en-IN") : "—"} · paid months:{" "}
            {sub.paid_months}
          </div>
        )}

        {msg && (
          <div className="mb-4 text-center text-sm bg-amber-50 text-amber-900 rounded-lg py-2 px-3">
            {msg}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {(["basic", "advance", "ultra"] as PlanId[]).map((id) => {
            const p = PLANS[id];
            const ultraLocked = id === "ultra" && (sub?.paid_months || 0) < 3;
            return (
              <div
                key={id}
                className={`rounded-2xl border p-5 bg-white ${
                  id === "advance" ? "border-[#E8820C] shadow-md" : "border-slate-200"
                }`}
              >
                <div className="text-xs font-semibold text-[#E8820C] uppercase">{p.name}</div>
                <div className="text-3xl font-bold mt-2 text-[#0F1624]">
                  ₹{(p.price / 1000).toFixed(0)}k
                </div>
                <div className="text-xs text-slate-500 mb-4">per month</div>
                <ul className="text-sm text-slate-600 space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                {ultraLocked ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400"
                  >
                    Unlock after 3 months
                  </button>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => pay(id)}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${
                      id === "advance" ? "bg-[#E8820C]" : "bg-[#0F1624]"
                    } disabled:opacity-60`}
                  >
                    {busy ? "Processing…" : "Pay & activate"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 text-center mt-8">
          Test mode: activates 30 days without real payment gateway. Razorpay can be added next.
        </p>
      </main>
    </div>
  );
}