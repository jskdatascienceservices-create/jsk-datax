"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

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
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      router.push("/upload");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-saffron rounded-lg flex items-center justify-center text-white text-sm font-extrabold">
            J
          </div>
          <div>
            <div className="font-bold text-ink">JSK DataX Services</div>
            <div className="text-xs text-muted">Staff login</div>
          </div>
        </div>

        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-saffron text-white rounded-lg text-sm font-semibold hover:bg-[#D4720A] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-muted mt-4 text-center">
          Owners use{" "}
          <Link href="/share" className="text-saffron font-semibold">
            /share
          </Link>{" "}
          — no login needed
        </p>
      </div>
    </div>
  );
}