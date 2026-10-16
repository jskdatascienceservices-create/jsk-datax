"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const sb = getSupabase();

      // 1) Create company
      const { data: company, error: cErr } = await sb
        .from("companies")
        .insert({
          name: companyName.trim(),
          location: "",
          price_per_metre: 15,
          working_days_per_month: 26,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      // 2) Create auth user
      const { data: auth, error: aErr } = await sb.auth.signUp({
        email: email.trim(),
        password,
      });
      if (aErr) throw aErr;
      if (!auth.user) throw new Error("Signup failed");

      // 3) Profile link
      const { error: pErr } = await sb.from("profiles").upsert({
        id: auth.user.id,
        company_id: company.id,
        full_name: fullName.trim(),
        email: email.trim(),
      });
      if (pErr) throw pErr;

      localStorage.setItem("jsk_active_company", company.id);
      router.push("/pricing");
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-[#E8820C] rounded-lg flex items-center justify-center text-white font-extrabold">
            L
          </div>
          <div>
            <div className="font-bold text-[#0F1624]">Loomvex</div>
            <div className="text-xs text-slate-500">Company sign up</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Company / mill name *</label>
            <input
              required
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Sharma Textiles"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Your name</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Email *</label>
            <input
              type="email"
              required
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Password *</label>
            <input
              type="password"
              required
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#E8820C] text-white rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-4 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[#E8820C] font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}