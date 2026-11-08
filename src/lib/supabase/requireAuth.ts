"use client";

import { getSupabase, isSupabaseConfigured } from "./client";

export async function requireLoggedIn(): Promise<
  { ok: true; userId: string; email: string } | { ok: false }
> {
  if (!isSupabaseConfigured()) return { ok: false };
  const { data } = await getSupabase().auth.getUser();
  const user = data.user;
  if (!user) return { ok: false };
  return { ok: true, userId: user.id, email: user.email || "" };
}