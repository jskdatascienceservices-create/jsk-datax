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
  createdAt: string;
};

type Loom = {
  id: string;
  companyId: string;
  loomNumber: string;
  targetPerShift: number;
};

export default function SetupPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [looms, setLooms] = useState<Loom[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [message, setMessage] = useState("");

  // Company form
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [pricePerMetre, setPricePerMetre] = useState("15");
  const [workingDays, setWorkingDays] = useState("26");

  // Loom form
  const [loomNumber, setLoomNumber] = useState("");
  const [targetPerShift, setTargetPerShift] = useState("500");

  useEffect(() => {
    const c = localStorage.getItem("jsk_companies");
    const l = localStorage.getItem("jsk_looms");
    const active = localStorage.getItem("jsk_active_company");
    if (c) setCompanies(JSON.parse(c));
    if (l) setLooms(JSON.parse(l));
    if (active) setSelectedCompanyId(active);
  }, []);

  const showMsg = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  const saveCompany = () => {
    if (!name.trim()) {
      showMsg("Please enter company / mill name");
      return;
    }
    const company: Company = {
      id: Date.now().toString(),
      name: name.trim(),
      location: location.trim() || "Bhilwara, Rajasthan",
      ownerName: ownerName.trim() || "",
      pricePerMetre: Number(pricePerMetre) || 15,
      workingDaysPerMonth: Number(workingDays) || 26,
      createdAt: new Date().toISOString(),
    };
    const updated = [...companies, company];
    setCompanies(updated);
    localStorage.setItem("jsk_companies", JSON.stringify(updated));
    localStorage.setItem("jsk_active_company", company.id);
    setSelectedCompanyId(company.id);
    setName("");
    setLocation("");
    setOwnerName("");
    setPricePerMetre("15");
    setWorkingDays("26");
    showMsg(`✅ Company "${company.name}" added and selected`);
  };

  const selectCompany = (id: string) => {
    setSelectedCompanyId(id);
    localStorage.setItem("jsk_active_company", id);
    const c = companies.find((x) => x.id === id);
    showMsg(`Selected: ${c?.name}`);
  };

  const saveLoom = () => {
    if (!selectedCompanyId) {
      showMsg("Please select or add a company first");
      return;
    }
    if (!loomNumber.trim()) {
      showMsg("Please enter loom number");
      return;
    }
    const exists = looms.some(
      (l) => l.companyId === selectedCompanyId && l.loomNumber === loomNumber.trim()
    );
    if (exists) {
      showMsg("This loom number already exists for this company");
      return;
    }
    const loom: Loom = {
      id: Date.now().toString(),
      companyId: selectedCompanyId,
      loomNumber: loomNumber.trim(),
      targetPerShift: Number(targetPerShift) || 500,
    };
    const updated = [...looms, loom];
    setLooms(updated);
    localStorage.setItem("jsk_looms", JSON.stringify(updated));
    setLoomNumber("");
    setTargetPerShift("500");
    showMsg(`✅ Loom ${loom.loomNumber} added`);
  };

  const deleteLoom = (id: string) => {
    const updated = looms.filter((l) => l.id !== id);
    setLooms(updated);
    localStorage.setItem("jsk_looms", JSON.stringify(updated));
    showMsg("Loom removed");
  };

  const activeCompany = companies.find((c) => c.id === selectedCompanyId);
  const companyLooms = looms.filter((l) => l.companyId === selectedCompanyId);

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
          <Link href="/data-entry" className="text-sm text-white/70 hover:text-white transition">
            Insert Data
          </Link>
          <span className="text-sm text-saffron font-semibold">Setup</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Company & Loom Setup</h1>
        <p className="text-sm text-muted mb-6">
          Add mills/companies and their looms. Revenue = Production metres × Price per metre.
        </p>

        {message && (
          <div className="mb-4 px-4 py-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
            {message}
          </div>
        )}

        {/* ADD COMPANY */}
        <div className="bg-white border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-ink mb-4">1. Add Company / Mill</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Company / Mill Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sharma Textiles"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bhilwara, Rajasthan"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Owner Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Sharma Ji"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Price per Metre (₹) *</label>
              <input
                type="number"
                value={pricePerMetre}
                onChange={(e) => setPricePerMetre(e.target.value)}
                placeholder="15"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Working Days / Month</label>
              <input
                type="number"
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                placeholder="26"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={saveCompany}
            className="mt-5 px-6 py-2.5 bg-saffron text-white rounded-lg text-sm font-semibold hover:bg-[#D4720A] transition"
          >
            Save Company
          </button>
        </div>

        {/* SELECT COMPANY */}
        {companies.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-ink mb-4">2. Select Active Company</h2>
            <div className="space-y-2">
              {companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectCompany(c.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition ${
                    selectedCompanyId === c.id
                      ? "border-saffron bg-saffron/5"
                      : "border-border hover:border-saffron/50"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">{c.name}</div>
                    <div className="text-xs text-muted">
                      {c.location} · ₹{c.pricePerMetre}/metre · {c.workingDaysPerMonth} days/month
                    </div>
                  </div>
                  {selectedCompanyId === c.id && (
                    <span className="text-xs font-semibold text-saffron">Active</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD LOOMS */}
        {activeCompany && (
          <div className="bg-white border border-border rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-ink mb-1">
              3. Add Looms for {activeCompany.name}
            </h2>
            <p className="text-xs text-muted mb-4">
              Each loom will have 3 shifts (Morning / Afternoon / Night) on the data entry page.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Loom Number *</label>
                <input
                  type="text"
                  value={loomNumber}
                  onChange={(e) => setLoomNumber(e.target.value)}
                  placeholder="e.g. 01 or 07"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Target metres / shift</label>
                <input
                  type="number"
                  value={targetPerShift}
                  onChange={(e) => setTargetPerShift(e.target.value)}
                  placeholder="500"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={saveLoom}
              className="mt-5 px-6 py-2.5 bg-saffron text-white rounded-lg text-sm font-semibold hover:bg-[#D4720A] transition"
            >
              Add Loom
            </button>

            {companyLooms.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink mb-2">
                  Looms ({companyLooms.length})
                </h3>
                <div className="space-y-2">
                  {companyLooms.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between text-sm bg-surface rounded-lg px-3 py-2"
                    >
                      <span>
                        Loom {l.loomNumber} · Target {l.targetPerShift} mtrs/shift
                      </span>
                      <button
                        onClick={() => deleteLoom(l.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <Link href="/" className="text-sm text-saffron font-semibold hover:underline">
            ← Back to Dashboard
          </Link>
          <Link
            href="/data-entry"
            className="text-sm font-semibold px-5 py-2 bg-saffron text-white rounded-lg hover:bg-[#D4720A] transition"
          >
            Next: Insert Daily Data →
          </Link>
        </div>
      </main>
    </div>
  );
}