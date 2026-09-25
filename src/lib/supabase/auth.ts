"use client";

import { getSupabase, isSupabaseConfigured } from "./client";

export async function getSession() {
  if (!isSupabaseConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export async function requireUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function signOut() {
  if (!isSupabaseConfigured()) return;
  await getSupabase().auth.signOut();
}