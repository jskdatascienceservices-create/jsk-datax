"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { getProfile, getActiveSubscription } from "@/lib/supabase/subscription";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;

      const profile = await getProfile();
      if (profile?.company_id) {
        localStorage.setItem("jsk_active_company", profile.company_id);
        const sub = await getActiveSubscription(profile.company_id);
        router.push(sub ? "/" : "/pricing");
      } else {
        router.push("/pricing");
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-[#E8820C] rounded-lg flex items-center justify-center text-white font-extrabold">
            L
          </div>
          <div>
            <div className="font-bold text-[#0F1624]">Loomvex</div>
            <div className="text-xs text-slate-500">Company login</div>
          </div>
        </div>

        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Password</label>
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-4 text-center">
          New company?{" "}
          <Link href="/signup" className="text-[#E8820C] font-semibold">
            Sign up
          </Link>
        </p>
      </div>