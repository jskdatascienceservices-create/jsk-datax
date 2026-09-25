"use client";

import { useState } from "react";
import Link from "next/link";
import {
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  fetchCompanies,
  upsertCompany,
  insertProductionRows,
  replaceInventory,
} from "@/lib/supabase/data";

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else current += c;
    }
    result.push(current.trim());
    return result;
  });
}

function downloadTemplate(type: "companies" | "production" | "inventory") {
  let content = "";
  let filename = "";
  if (type === "companies") {
    filename = "Companies.csv";
    content =
      "Company,Location,Owner,Price_Per_Metre,Working_Days\n" +
      "Sharma Textiles,Bhilwara Rajasthan,Sharma Ji,15,26\n";
  } else if (type === "production") {
    filename = "Production.csv";
    content =
      "Date,Company,Loom,Shift,Meters,Defect_Meters\n" +
      "2026-09-25,Sharma Textiles,01,morning,420,7.5\n" +
      "2026-09-25,Sharma Textiles,07,night,290,32\n";
  } else {
    filename = "Inventory.csv";
    content =
      "Date,Company,Item,Quantity,Daily_Usage,Unit\n" +
      "2026-09-25,Sharma Textiles,Grey Cloth (Greige),2400,400,mtrs\n" +
      "2026-09-25,Sharma Textiles,Grey Cotton Yarn,480,26.7,kg\n";
  }
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UploadPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const show = (text: string) => setMessage(text);

  const ensureCompanyId = async (companyName: string) => {
    const list = await fetchCompanies();
    const existing = list.find(
      (c) => c.name.toLowerCase() === companyName.toLowerCase()
    );
    if (existing) {
      localStorage.setItem("jsk_active_company", existing.id);
      return existing.id;
    }
    const created = await upsertCompany({
      name: companyName,
      location: "",
      price_per_metre: 15,
    });
    localStorage.setItem("jsk_active_company", created.id);
    return created.id;
  };

  const handleCompanies = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return show("Companies file empty");

    const header = rows[0].map((h) => h.toLowerCase());
    const companyIdx = header.findIndex((h) => h.includes("company"));
    const locIdx = header.findIndex((h) => h.includes("location"));
    const ownerIdx = header.findIndex((h) => h.includes("owner"));
    const priceIdx = header.findIndex((h) => h.includes("price"));
    const daysIdx = header.findIndex((h) => h.includes("working") || h.includes("days"));

    if (companyIdx < 0) return show("Need column: Company");

    let count = 0;
    let firstId = "";
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[companyIdx]) continue;
      const created = await upsertCompany({
        name: r[companyIdx],
        location: locIdx >= 0 ? r[locIdx] : "",
        owner_name: ownerIdx >= 0 ? r[ownerIdx] : "",
        price_per_metre: priceIdx >= 0 ? Number(r[priceIdx]) || 15 : 15,
        working_days_per_month: daysIdx >= 0 ? Number(r[daysIdx]) || 26 : 26,
      });
      if (!firstId) firstId = created.id;
      count++;
    }
    if (firstId) localStorage.setItem("jsk_active_company", firstId);
    show(`✅ Saved ${count} company(ies) to Supabase`);
  };

  const handleProduction = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return show("Production file empty");

    const header = rows[0].map((h) => h.toLowerCase());
    const dateIdx = header.findIndex((h) => h.includes("date"));
    const companyIdx = header.findIndex((h) => h.includes("company"));
    const loomIdx = header.findIndex((h) => h.includes("loom"));
    const shiftIdx = header.findIndex((h) => h.includes("shift"));
    const metersIdx = header.findIndex((h) => h.includes("meter") && !h.includes("defect"));
    const defectIdx = header.findIndex((h) => h.includes("defect"));

    if (loomIdx < 0 || shiftIdx < 0 || metersIdx < 0) {
      return show("Need columns: Loom, Shift, Meters, Defect_Meters");
    }

    const payload: {
      company_id: string;
      production_date: string;
      loom: string;
      shift: string;
      meters: number;
      defect_meters: number;
    }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[loomIdx] || !r[metersIdx]) continue;
      const companyName = companyIdx >= 0 ? r[companyIdx] : "Default Mill";
      const companyId = await ensureCompanyId(companyName || "Default Mill");
      let shift = (r[shiftIdx] || "morning").toLowerCase().trim();
      if (!["morning", "afternoon", "night"].includes(shift)) shift = "morning";
      payload.push({
        company_id: companyId,
        production_date:
          dateIdx >= 0 && r[dateIdx]
            ? r[dateIdx]
            : new Date().toISOString().slice(0, 10),
        loom: String(r[loomIdx]).replace(/^Loom\s*/i, "").trim(),
        shift,
        meters: Number(r[metersIdx]) || 0,
        defect_meters: defectIdx >= 0 ? Number(r[defectIdx]) || 0 : 0,
      });
    }

    await insertProductionRows(payload);
    show(`✅ Saved ${payload.length} production rows to Supabase`);
  };

  const handleInventory = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return show("Inventory file empty");

    const header = rows[0].map((h) => h.toLowerCase());
    const companyIdx = header.findIndex((h) => h.includes("company"));
    const itemIdx = header.findIndex((h) => h.includes("item") || h.includes("name"));
    const qtyIdx = header.findIndex(
      (h) => h.includes("quantity") || h.includes("qty") || h.includes("stock")
    );
    const usageIdx = header.findIndex(
      (h) => h.includes("daily") || h.includes("usage") || h.includes("consumption")
    );
    const unitIdx = header.findIndex((h) => h.includes("unit"));

    if (itemIdx < 0 || qtyIdx < 0 || usageIdx < 0) {
      return show("Need columns: Item, Quantity, Daily_Usage");
    }

    // Group by company
    const byCompany: Record<
      string,
      { name: string; quantity: number; daily_usage: number; unit: string }[]
    > = {};

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[itemIdx]) continue;
      const companyName = companyIdx >= 0 ? r[companyIdx] : "Default Mill";
      const companyId = await ensureCompanyId(companyName || "Default Mill");
      if (!byCompany[companyId]) byCompany[companyId] = [];
      byCompany[companyId].push({
        name: r[itemIdx],
        quantity: Number(r[qtyIdx]) || 0,
        daily_usage: Number(r[usageIdx]) || 1,
        unit: unitIdx >= 0 ? r[unitIdx] || "kg" : "kg",
      });
    }

    let total = 0;
    for (const [companyId, items] of Object.entries(byCompany)) {
      await replaceInventory(companyId, items);
      total += items.length;
    }
    show(`✅ Saved ${total} inventory items to Supabase`);
  };

  const onFile =
    (type: "companies" | "production" | "inventory") =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        show("Please upload a .csv file");
        return;
      }
      if (!isSupabaseConfigured()) {
        show("Supabase not configured. Check .env.local and restart npm run dev.");
        return;
      }
      setBusy(true);
      try {
        if (type === "companies") await handleCompanies(file);
        if (type === "production") await handleProduction(file);
        if (type === "inventory") await handleInventory(file);
      } catch (err: any) {
        console.error(err);
        show("Upload failed: " + (err?.message || "check Supabase tables & RLS"));
      }
      setBusy(false);
      e.target.value = "";
    };

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-ink h-14 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-saffron rounded-lg flex items-center justify-center text-white text-xs font-extrabold">
            J
          </div>
          <span className="text-white font-bold text-sm">JSK DataX Services</span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/" className="text-white/70 hover:text-white">
            Dashboard
          </Link>
          <span className="text-saffron font-semibold">Upload Sheet</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Upload CSV → Supabase</h1>
        <p className="text-sm text-muted mb-6">
          Supervisor sheet → Download CSV → Upload here → Dashboard reads from cloud
        </p>

        {!isSupabaseConfigured() && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Supabase keys missing. Fix `.env.local` in project root and restart server.
          </div>
        )}

        {message && (
          <div className="mb-4 px-4 py-3 bg-green-50 text-green-800 rounded-lg text-sm font-medium">
            {message}
          </div>
        )}

        {busy && (
          <div className="mb-4 text-sm text-saffron font-medium">Uploading to Supabase…</div>
        )}

        <div className="bg-white border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold mb-2">Download templates</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadTemplate("companies")} className="text-xs px-3 py-2 border rounded-lg">
              Companies.csv
            </button>
            <button type="button" onClick={() => downloadTemplate("production")} className="text-xs px-3 py-2 border rounded-lg">
              Production.csv
            </button>
            <button type="button" onClick={() => downloadTemplate("inventory")} className="text-xs px-3 py-2 border rounded-lg">
              Inventory.csv
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <Box title="1. Companies.csv" hint="Company, Location, Owner, Price_Per_Metre, Working_Days" onChange={onFile("companies")} />
          <Box title="2. Production.csv" hint="Date, Company, Loom, Shift, Meters, Defect_Meters" onChange={onFile("production")} />
          <Box title="3. Inventory.csv" hint="Date, Company, Item, Quantity, Daily_Usage, Unit" onChange={onFile("inventory")} />
        </div>

        <div className="mt-8 flex justify-between">
          <Link href="/" className="text-sm text-saffron font-semibold">
            ← Open Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

function Box({
  title,
  hint,
  onChange,
}: {
  title: string;
  hint: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-ink mb-1">{title}</h2>
      <p className="text-xs text-muted mb-3">{hint}</p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={onChange}
        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-saffron file:text-white file:font-semibold"
      />
    </div>
  );
}