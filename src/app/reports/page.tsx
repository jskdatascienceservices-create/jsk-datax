"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchProduction,
  fetchCompanies,
  type DbProduction,
  type DbCompany,
} from "@/lib/supabase/data";
import {
  getProfile,
  getActiveSubscription,
  canUseReports,
  type PlanId,
} from "@/lib/supabase/subscription";
import { isFounder } from "@/lib/supabase/admin";

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

type Range = "day" | "month" | "year";

type Bucket = {
  key: string;
  label: string;
  meters: number;
  defect: number;
};

export default function ReportsPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [company, setCompany] = useState<DbCompany | null>(null);
  const [production, setProduction] = useState<DbProduction[]>([]);
  const [range, setRange] = useState<Range>("day");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured()) {
        setMsg("Supabase not configured");
        setLoading(false);
        return;
      }
      const profile = await getProfile();
      if (!profile) {
        router.replace("/login");
        return;
      }
      const userEmail = profile.email || "";
      setEmail(userEmail);

      const companyId =
        profile.company_id || localStorage.getItem("jsk_active_company") || "";
      if (!companyId) {
        setMsg("No company linked");
        setLoading(false);
        return;
      }
      localStorage.setItem("jsk_active_company", companyId);

      const sub = await getActiveSubscription(companyId);
      if (!sub && !isFounder(userEmail)) {
        router.replace("/pricing");
        return;
      }
      const currentPlan = (sub?.plan as PlanId) || null;
      setPlan(currentPlan);

      if (!canUseReports(currentPlan, userEmail)) {
        setLoading(false);
        return;
      }

      const companies = await fetchCompanies();
      setCompany(companies.find((c) => c.id === companyId) || null);
      const prod = await fetchProduction(companyId);
      setProduction(prod || []);
      setLoading(false);
    })();
  }, [router]);

  const price = Number(company?.price_per_metre ?? 15);

  const buckets: Bucket[] = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const r of production) {
      const raw = String((r as any).production_date || (r as any).date || "");
      if (!raw) continue;
      const d = new Date(raw.slice(0, 10) + "T12:00:00");
      if (Number.isNaN(d.getTime())) continue;

      let key = "";
      let label = "";
      if (range === "day") {
        key = raw.slice(0, 10);
        label = d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });
      } else if (range === "month") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        });
      } else {
        key = String(d.getFullYear());
        label = key;
      }

      const meters = Number((r as any).meters ?? 0);
      const defect = Number((r as any).defect_meters ?? 0);
      if (!map.has(key)) map.set(key, { key, label, meters: 0, defect: 0 });
      const b = map.get(key)!;
      b.meters += meters;
      b.defect += defect;
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [production, range]);

  const totals = useMemo(() => {
    const meters = buckets.reduce((s, b) => s + b.meters, 0);
    const defect = buckets.reduce((s, b) => s + b.defect, 0);
    return {
      meters,
      defect,
      defectPct: meters > 0 ? (defect / meters) * 100 : 0,
      revenue: meters * price,
      periods: buckets.length,
    };
  }, [buckets, price]);

  const maxMeters = Math.max(...buckets.map((b) => b.meters), 1);

  async function downloadPdf() {
    if (!reportRef.current) return;
    setPdfBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(img, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(img, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      const name = (company?.name || "loomvex").replace(/\s+/g, "-");
      pdf.save(
        `${name}-report-${range}-${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (e) {
      console.error(e);
      alert("PDF failed. Use browser Print → Save as PDF.");
    }
    setPdfBusy(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading reports…
      </div>
    );
  }

  if (!canUseReports(plan, email)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <nav className="bg-[#0F1624] h-14 px-6 flex items-center justify-between">
          <Link href="/" className="text-white font-bold">
            Loomvex
          </Link>
          <Link href="/pricing" className="text-[#E8820C] text-sm font-semibold">
            Upgrade
          </Link>
        </nav>
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Reports</h1>
          <p className="text-sm text-slate-600 mb-6">
            Day / month / year reports are in <b>Advance</b> and <b>Ultra</b>.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2.5 bg-[#E8820C] text-white rounded-lg text-sm font-semibold"
          >
            View plans
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-[#0F1624] h-14 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#E8820C] rounded-lg flex items-center justify-center text-white text-xs font-extrabold">
            L
          </div>
          <span className="text-white font-bold text-sm">Loomvex</span>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-white/70 hover:text-white">
            Dashboard
          </Link>
          <Link href="/history" className="text-white/70 hover:text-white">
            History
          </Link>
          <span className="text-[#E8820C] font-semibold">Reports</span>
          <Link href="/ai" className="text-white/70 hover:text-white">
            AI
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F1624]">Reports</h1>
            <p className="text-sm text-slate-500 mt-1">
              {company?.name || "Company"} · production & revenue
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
              {(["day", "month", "year"] as Range[]).map((r) => (
                <button
  type="button"
  onClick={downloadPdf}
  disabled={pdfBusy}
  className="px-4 py-2 bg-[#E8820C] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-[#D4720A] disabled:opacity-60 border border-orange-400"
>
  {pdfBusy ? "Preparing PDF…" : "Download PDF"}
</button>
              ))}
            </div>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={pdfBusy}
              className="px-4 py-2 bg-[#0F1624] text-white rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {pdfBusy ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        </div>

        {msg && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            {msg}
          </div>
        )}

        {/* PDF capture area: KPIs + chart + table */}
        <div ref={reportRef} className="bg-white rounded-xl p-4 sm:p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <div className="text-lg font-bold text-[#0F1624]">
              Loomvex · {company?.name || "Report"}
            </div>
            <div className="text-xs text-slate-500">
              {range.toUpperCase()} report · {new Date().toLocaleDateString("en-IN")} · ₹
              {price}/metre
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                t: "Production",
                v: `${totals.meters.toLocaleString("en-IN")} m`,
              },
              { t: "Revenue", v: formatINR(totals.revenue) },
              { t: "Avg defect", v: `${totals.defectPct.toFixed(2)}%` },
              { t: "Periods", v: String(totals.periods) },
            ].map((k) => (
              <div
                key={k.t}
                className="border border-slate-200 rounded-xl p-4"
              >
                <div className="text-xs text-slate-500">{k.t}</div>
                <div className="text-lg font-bold text-[#0F1624] mt-1">{k.v}</div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#0F1624] mb-4">
              Production by {range}
            </h2>
            {buckets.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {buckets.map((b) => {
                  const pct = Math.round((b.meters / maxMeters) * 100);
                  const defPct =
                    b.meters > 0 ? (b.defect / b.meters) * 100 : 0;
                  return (
                    <div key={b.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">
                          {b.label}
                        </span>
                        <span className="text-slate-500">
                          {b.meters.toLocaleString("en-IN")} m ·{" "}
                          {formatINR(b.meters * price)} · defect{" "}
                          {defPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#E8820C] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {buckets.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-2">Period</th>
                  <th className="py-2 pr-2">Metres</th>
                  <th className="py-2 pr-2">Defect %</th>
                  <th className="py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => {
                  const defPct =
                    b.meters > 0 ? (b.defect / b.meters) * 100 : 0;
                  return (
                    <tr key={b.key} className="border-t border-slate-50">
                      <td className="py-2 pr-2 font-medium">{b.label}</td>
                      <td className="py-2 pr-2">
                        {b.meters.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-2">{defPct.toFixed(2)}%</td>
                      <td className="py-2">
                        {formatINR(b.meters * price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}