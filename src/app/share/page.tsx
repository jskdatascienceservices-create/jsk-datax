"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  calcDefectRate,
  calcDaysRemaining,
  getStockStatus,
  getDefectStatus,
  formatINR,
  formatNumber,
} from "@/lib/calculations";
import {
  fetchCompanies,
  fetchProduction,
  fetchInventory,
  type DbCompany,
} from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SharePage() {
  const [company, setCompany] = useState<DbCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalMeters, setTotalMeters] = useState(0);
  const [avgDefect, setAvgDefect] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [rows, setRows] = useState<
    { loom: string; shift: string; meters: number; rate: number; status: string }[]
  >([]);
  const [inventory, setInventory] = useState<
    { name: string; days: number; status: string }[]
  >([]);
  const [copied, setCopied] = useState(false);
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );

    (async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      const list = await fetchCompanies();
      const activeId = localStorage.getItem("jsk_active_company");
      const active = list.find((c) => c.id === activeId) || list[0] || null;
      setCompany(active);
      if (!active) {
        setLoading(false);
        return;
      }

      const [prod, inv] = await Promise.all([
        fetchProduction(active.id),
        fetchInventory(active.id),
      ]);
      const price = Number(active.price_per_metre) || 15;
      const totalM = prod.reduce((s, p) => s + Number(p.meters), 0);
      const totalD = prod.reduce((s, p) => s + Number(p.defect_meters), 0);
      setTotalMeters(totalM);
      setAvgDefect(totalM > 0 ? calcDefectRate(totalD, totalM) : 0);
      setRevenue(totalM * price);

      setRows(
        prod.map((p) => {
          const rate = calcDefectRate(Number(p.defect_meters), Number(p.meters));
          return {
            loom: p.loom,
            shift: p.shift,
            meters: Number(p.meters),
            rate,
            status: getDefectStatus(rate),
          };
        })
      );

      setInventory(
        inv.map((i) => {
          const days = calcDaysRemaining(Number(i.quantity), Number(i.daily_usage));
          return { name: i.name, days, status: getStockStatus(days) };
        })
      );
      setLoading(false);
    })();
  }, []);

  const whatsappText = company
    ? `*${company.name} — Daily Report (${dateStr})*\n\n` +
      `✅ Production: ${totalMeters.toLocaleString("en-IN")} mtrs\n` +
      `📊 Avg Defect: ${avgDefect}%\n` +
      `💰 Revenue: ${formatINR(revenue)} (× ₹${company.price_per_metre}/m)\n` +
      (inventory.some((i) => i.status === "low")
        ? `\n⚠️ Low stock: ${inventory
            .filter((i) => i.status === "low")
            .map((i) => `${i.name} (${i.days}d)`)
            .join(", ")}`
        : "") +
      `\n\nDashboard: ${typeof window !== "undefined" ? window.location.origin + "/share" : ""}\n— JSK DataX Services`
    : "";

  const copyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank");
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
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-white/60 hover:text-white">
            Full dashboard
          </Link>
          <span className="text-white/40">Owner view</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-muted">Loading from cloud…</p>
        ) : !company ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            No company data in Supabase. Upload Companies + Production CSV first.
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-ink">{company.name}</h1>
            <p className="text-sm text-muted mb-6">
              {company.location} · {dateStr}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card label="Production" value={`${formatNumber(totalMeters)} m`} />
              <Card label="Revenue" value={formatINR(revenue)} highlight />
              <Card label="Avg Defect" value={`${avgDefect}%`} />
              <Card
                label="Alerts"
                value={String(rows.filter((r) => r.status === "alert").length)}
                danger
              />
            </div>

            {rows.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-4 mb-4">
                <div className="text-sm font-semibold mb-3">Loom × Shift</div>
                {rows.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm border-b border-border/50 py-2">
                    <span>
                      Loom {r.loom} · <span className="capitalize">{r.shift}</span>
                    </span>
                    <span>
                      {r.meters} m ·{" "}
                      <span
                        className={
                          r.status === "alert"
                            ? "text-red-600 font-semibold"
                            : r.status === "watch"
                            ? "text-amber-600"
                            : "text-green-600"
                        }
                      >
                        {r.rate}%
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {inventory.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-4 mb-6">
                <div className="text-sm font-semibold mb-3">Stock (days left)</div>
                {inventory.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span>{i.name}</span>
                    <span
                      className={
                        i.status === "low"
                          ? "text-red-600 font-semibold"
                          : i.status === "warn"
                          ? "text-amber-600"
                          : "text-green-600"
                      }
                    >
                      {i.days} days
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={copyWhatsApp}
                className="flex-1 px-4 py-3 bg-ink text-white rounded-xl text-sm font-semibold"
              >
                {copied ? "✅ Copied!" : "📋 Copy WhatsApp message"}
              </button>
              <button
                onClick={openWhatsApp}
                className="flex-1 px-4 py-3 bg-[#25D366] text-white rounded-xl text-sm font-semibold"
              >
                💬 Open WhatsApp
              </button>
            </div>

            <p className="text-xs text-muted mt-6">
              After deploy, share this link with the owner:
              <br />
              <code className="text-saffron">your-app.vercel.app/share</code>
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="text-[11px] text-muted">{label}</div>
      <div
        className={`text-2xl font-bold font-mono ${
          highlight ? "text-saffron" : danger ? "text-red-600" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}