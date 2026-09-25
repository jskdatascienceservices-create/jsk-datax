"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Company = {
  id: string;
  name: string;
  location: string;
  ownerName: string;
  pricePerMetre: number;
  workingDaysPerMonth: number;
};

type Loom = {
  id: string;
  companyId: string;
  loomNumber: string;
  targetPerShift: number;
};

type ProductionEntry = {
  id: string;
  companyId: string;
  loom: string;
  shift: "morning" | "afternoon" | "night";
  meters: number;
  defectMeters: number;
  date: string;
};

type InventoryEntry = {
  id: string;
  companyId: string;
  name: string;
  quantity: number;
  dailyUsage: number;
  unit: string;
};

type RevenueEntry = {
  id: string;
  companyId: string;
  amount: number;
  description: string;
  date: string;
};

export default function DataEntryPage() {
  const [tab, setTab] = useState<"production" | "inventory" | "revenue">("production");
  const [message, setMessage] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [looms, setLooms] = useState<Loom[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  // Production form
  const [loom, setLoom] = useState("");
  const [shift, setShift] = useState<"morning" | "afternoon" | "night">("morning");
  const [meters, setMeters] = useState("");
  const [defectMeters, setDefectMeters] = useState("");

  // Inventory form
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dailyUsage, setDailyUsage] = useState("");
  const [unit, setUnit] = useState("kg");

  // Revenue form (optional manual entry — main revenue will come from production × price)
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [productionList, setProductionList] = useState<ProductionEntry[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryEntry[]>([]);
  const [revenueList, setRevenueList] = useState<RevenueEntry[]>([]);

  useEffect(() => {
    const c = localStorage.getItem("jsk_companies");
    const l = localStorage.getItem("jsk_looms");
    const active = localStorage.getItem("jsk_active_company");
    const p = localStorage.getItem("jsk_production");
    const i = localStorage.getItem("jsk_inventory");
    const r = localStorage.getItem("jsk_revenue");

    const companiesData: Company[] = c ? JSON.parse(c) : [];
    const loomsData: Loom[] = l ? JSON.parse(l) : [];
    setCompanies(companiesData);
    setLooms(loomsData);

    if (active) {
      setActiveCompanyId(active);
      const company = companiesData.find((x) => x.id === active) || null;
      setActiveCompany(company);
      const companyLooms = loomsData.filter((x) => x.companyId === active);
      if (companyLooms.length > 0) setLoom(companyLooms[0].loomNumber);
    }

    if (p) setProductionList(JSON.parse(p));
    if (i) setInventoryList(JSON.parse(i));
    if (r) setRevenueList(JSON.parse(r));
  }, []);

  const companyLooms = looms.filter((l) => l.companyId === activeCompanyId);

  const showMsg = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  const saveProduction = () => {
    if (!activeCompanyId) {
      showMsg("Please set up and select a company first (Setup page)");
      return;
    }
    if (!loom) {
      showMsg("Please select a loom");
      return;
    }
    if (!meters) {
      showMsg("Please enter meters produced");
      return;
    }
    const entry: ProductionEntry = {
      id: Date.now().toString(),
      companyId: activeCompanyId,
      loom,
      shift,
      meters: Number(meters),
      defectMeters: Number(defectMeters) || 0,
      date: new Date().toISOString().slice(0, 10),
    };
    const updated = [...productionList, entry];
    setProductionList(updated);
    localStorage.setItem("jsk_production", JSON.stringify(updated));
    setMeters("");
    setDefectMeters("");
    showMsg("✅ Production data saved!");
  };

  const saveInventory = () => {
    if (!activeCompanyId) {
      showMsg("Please set up and select a company first");
      return;
    }
    if (!itemName || !quantity || !dailyUsage) {
      showMsg("Please fill all inventory fields");
      return;
    }
    const entry: InventoryEntry = {
      id: Date.now().toString(),
      companyId: activeCompanyId,
      name: itemName,
      quantity: Number(quantity),
      dailyUsage: Number(dailyUsage),
      unit,
    };
    const updated = [...inventoryList, entry];
    setInventoryList(updated);
    localStorage.setItem("jsk_inventory", JSON.stringify(updated));
    setItemName("");
    setQuantity("");
    setDailyUsage("");
    showMsg("✅ Inventory data saved!");
  };

  const saveRevenue = () => {
    if (!activeCompanyId) {
      showMsg("Please set up and select a company first");
      return;
    }
    if (!amount) {
      showMsg("Please enter amount");
      return;
    }
    const entry: RevenueEntry = {
      id: Date.now().toString(),
      companyId: activeCompanyId,
      amount: Number(amount),
      description: description || "Sale",
      date: new Date().toISOString().slice(0, 10),
    };
    const updated = [...revenueList, entry];
    setRevenueList(updated);
    localStorage.setItem("jsk_revenue", JSON.stringify(updated));
    setAmount("");
    setDescription("");
    showMsg("✅ Revenue data saved!");
  };

  const clearAll = () => {
    if (confirm("Clear all saved production / inventory / revenue data?")) {
      localStorage.removeItem("jsk_production");
      localStorage.removeItem("jsk_inventory");
      localStorage.removeItem("jsk_revenue");
      setProductionList([]);
      setInventoryList([]);
      setRevenueList([]);
      showMsg("All data cleared");
    }
  };

  // Filter lists for active company
  const myProduction = productionList.filter((p) => p.companyId === activeCompanyId);
  const myInventory = inventoryList.filter((i) => i.companyId === activeCompanyId);
  const myRevenue = revenueList.filter((r) => r.companyId === activeCompanyId);

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-ink h-14 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-saffron rounded-lg flex items-center justify-center text-white text-xs font-extrabold">
            J
          </div>
          <span className="text-white font-bold text-base">JSK DataX Services</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-white/70 hover:text-white transition">
            Dashboard
          </Link>
          <Link href="/setup" className="text-sm text-white/70 hover:text-white transition">
            Setup
          </Link>
          <span className="text-sm text-saffron font-semibold">Insert Data</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Insert Raw Data</h1>
        <p className="text-sm text-muted mb-2">
          Enter only raw numbers. System calculates defect %, stock days, revenue automatically.
        </p>

        {activeCompany ? (
          <div className="mb-6 px-4 py-3 bg-saffron/10 border border-saffron/30 rounded-lg text-sm">
            <span className="font-semibold text-ink">{activeCompany.name}</span>
            <span className="text-muted"> · {activeCompany.location} · ₹{activeCompany.pricePerMetre}/metre</span>
          </div>
        ) : (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            No company selected.{" "}
            <Link href="/setup" className="font-semibold underline">
              Go to Setup
            </Link>{" "}
            and add a company + looms first.
          </div>
        )}

        {message && (
          <div className="mb-4 px-4 py-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["production", "inventory", "revenue"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition ${
                tab === t
                  ? "bg-saffron text-white"
                  : "bg-white border border-border text-muted hover:border-saffron"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* PRODUCTION */}
        {tab === "production" && (
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">Production + Defect (per Loom + Shift)</h2>

            {companyLooms.length === 0 ? (
              <p className="text-sm text-muted">
                No looms found.{" "}
                <Link href="/setup" className="text-saffron font-semibold underline">
                  Add looms in Setup
                </Link>
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Loom</label>
                    <select
                      value={loom}
                      onChange={(e) => setLoom(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      {companyLooms.map((l) => (
                        <option key={l.id} value={l.loomNumber}>
                          Loom {l.loomNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Shift</label>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value as any)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="night">Night</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Meters Produced (raw)</label>
                    <input
                      type="number"
                      value={meters}
                      onChange={(e) => setMeters(e.target.value)}
                      placeholder="e.g. 420"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Defect Meters (raw)</label>
                    <input
                      type="number"
                      value={defectMeters}
                      onChange={(e) => setDefectMeters(e.target.value)}
                      placeholder="e.g. 7.5"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={saveProduction}
                  className="mt-5 px-6 py-2.5 bg-saffron text-white rounded-lg text-sm font-semibold hover:bg-[#D4720A] transition"
                >
                  Save Production Data
                </button>
              </>
            )}

            {myProduction.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink mb-2">Saved Production (this company)</h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {myProduction.map((p) => (
                    <div key={p.id} className="text-xs bg-surface rounded-lg px-3 py-2 flex justify-between">
                      <span>
                        Loom {p.loom} · {p.shift} · {p.meters} mtrs · Defect: {p.defectMeters}
                      </span>
                      <span className="text-muted">{p.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* INVENTORY */}
        {tab === "inventory" && (
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">Inventory Entry</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Item Name</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Grey Cloth (Greige)"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Current Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 2400"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Avg Daily Usage</label>
                <input
                  type="number"
                  value={dailyUsage}
                  onChange={(e) => setDailyUsage(e.target.value)}
                  placeholder="e.g. 400"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="kg">kg</option>
                  <option value="mtrs">mtrs</option>
                  <option value="ltrs">ltrs</option>
                </select>
              </div>
            </div>
            <button
              onClick={saveInventory}
              className="mt-5 px-6 py-2.5 bg-saffron text-white rounded-lg text-sm font-semibold hover:bg-[#D4720A] transition"
            >
              Save Inventory Data
            </button>

            {myInventory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink mb-2">Saved Inventory</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {myInventory.map((i) => {
                    const days = i.dailyUsage > 0 ? (i.quantity / i.dailyUsage).toFixed(1) : "—";
                    return (
                      <div key={i.id} className="text-xs bg-surface rounded-lg px-3 py-2 flex justify-between">
                        <span>
                          {i.name} · {i.quantity} {i.unit}
                        </span>
                        <span className="font-semibold text-saffron">{days} days left</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* REVENUE (optional extra) */}
        {tab === "revenue" && (
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink mb-2">Extra Revenue Entry (optional)</h2>
            <p className="text-xs text-muted mb-4">
              Main revenue is auto-calculated: Total metres × ₹{activeCompany?.pricePerMetre || 15}/metre.
              Use this only for extra sales if needed.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 85000"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Extra order"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={saveRevenue}
              className="mt-5 px-6 py-2.5 bg-saffron text-white rounded-lg text-sm font-semibold hover:bg-[#D4720A] transition"
            >
              Save Revenue
            </button>

            {myRevenue.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink mb-2">Saved Extra Revenue</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {myRevenue.map((r) => (
                    <div key={r.id} className="text-xs bg-surface rounded-lg px-3 py-2 flex justify-between">
                      <span>
                        ₹{r.amount.toLocaleString("en-IN")} · {r.description}
                      </span>
                      <span className="text-muted">{r.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between items-center">
          <Link href="/" className="text-sm text-saffron font-semibold hover:underline">
            ← Go to Dashboard
          </Link>
          <button onClick={clearAll} className="text-xs text-red-500 hover:underline">
            Clear All Saved Data
          </button>
        </div>
      </main>
    </div>
  );
}