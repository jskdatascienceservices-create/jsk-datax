"use client";

import Link from "next/link";

const PORTFOLIO = "https://jskdatascienceservices-create.github.io/portfolio-website/";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F1624]">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#0F1624] h-14 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E8820C] rounded-lg flex items-center justify-center text-white text-sm font-extrabold">
            L
          </div>
          <span className="text-white font-bold text-base">Loomvex</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5 text-sm">
          <a href="#product" className="text-white/70 hover:text-white hidden sm:inline">
            Product
          </a>
          <a href="#how" className="text-white/70 hover:text-white hidden sm:inline">
            How it works
          </a>
          <a
            href={PORTFOLIO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white hidden sm:inline"
          >
            Portfolio
          </a>
          <Link href="/login" className="text-white/70 hover:text-white">
            Login
          </Link>
          <a
            href="#contact"
            className="px-3 py-1.5 bg-[#E8820C] text-white rounded-lg font-semibold hover:bg-[#D4720A]"
          >
            Book demo
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-[#0F1624] px-4 sm:px-8 pt-14 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#E8820C] text-xs font-semibold tracking-widest uppercase mb-4">
            SaaS for production SMEs · India
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Data science for the factory floor.
            <br />
            <span className="text-[#E8820C]">No data science team required.</span>
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-8">
            Live production, defect %, stock and revenue from the same sheet your supervisor
            already fills. Built for textile and manufacturing SMEs in Bhilwara and beyond.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#contact"
              className="px-6 py-3 bg-[#E8820C] text-white rounded-xl font-semibold hover:bg-[#D4720A]"
            >
              Book a free demo
            </a>
            <Link
              href="/share"
              className="px-6 py-3 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/5"
            >
              See sample report
            </Link>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="px-4 sm:px-8 py-14 max-w-5xl mx-auto">
        <p className="text-[#E8820C] text-xs font-semibold tracking-widest uppercase mb-2">
          The problem
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">
          Most mills still run on paper and late Excel
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              t: "Delayed reports",
              d: "By the time numbers reach the owner, the shift is already over and the loss is done.",
            },
            {
              t: "No data scientist",
              d: "SMEs cannot hire analytics teams. Spreadsheets never become decisions.",
            },
            {
              t: "ERP is too heavy",
              d: "SAP-class software is built for large groups — not 20–100 loom units.",
            },
          ].map((c) => (
            <div key={c.t} className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-lg mb-2">{c.t}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCT */}
      <section id="product" className="bg-white px-4 sm:px-8 py-14 border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#E8820C] text-xs font-semibold tracking-widest uppercase mb-2">
            Product
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">What Loomvex does</h2>
          <p className="text-slate-600 mb-8 max-w-2xl">
            One platform: connect your daily data → see live KPIs → alert the owner → forecast
            production and revenue.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "01", t: "Connect", d: "Google Sheet or CSV — same format supervisor already uses." },
              { n: "02", t: "See", d: "Dashboard: loom × shift, defect %, stock days, revenue." },
              { n: "03", t: "Alert", d: "Share link + WhatsApp-ready daily summary for the owner." },
              { n: "04", t: "Predict", d: "Production & revenue forecasts as history builds up." },
            ].map((c) => (
              <div key={c.n} className="rounded-xl bg-[#0F1624] p-5 text-white">
                <div className="text-[#E8820C] font-bold text-sm mb-2">{c.n}</div>
                <h3 className="font-bold text-lg mb-2">{c.t}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="px-4 sm:px-8 py-14 max-w-5xl mx-auto">
        <p className="text-[#E8820C] text-xs font-semibold tracking-widest uppercase mb-2">
          How it works
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">Sheet → cloud → owner phone</h2>
        <ol className="space-y-4">
          {[
            "Supervisor fills production / stock in Google Sheet or Excel.",
            "You (or staff) upload CSV into Loomvex — secure login.",
            "System calculates defect %, stock days, revenue automatically.",
            "Owner opens share link or receives WhatsApp-style summary.",
          ].map((step, i) => (
            <li key={i} className="flex gap-4 items-start bg-white border border-slate-200 rounded-xl p-4">
              <span className="w-8 h-8 rounded-full bg-[#E8820C] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-sm sm:text-base pt-1">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* WHO */}
      <section className="bg-[#0F1624] px-4 sm:px-8 py-14">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#E8820C] text-xs font-semibold tracking-widest uppercase mb-2">
            Who it’s for
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Textile & production SMEs first
          </h2>
          <p className="text-white/60 max-w-2xl mb-8">
            Starting in Bhilwara’s textile cluster — then the same engine for other factories that
            live on daily production numbers.
          </p>
          <div className="flex flex-wrap gap-3">
            {["Textile mills", "Weaving units", "Processing plants", "Other production SMEs"].map(
              (t) => (
                <span
                  key={t}
                  className="px-4 py-2 rounded-full border border-white/20 text-white/90 text-sm"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ABOUT + PORTFOLIO */}
      <section className="px-4 sm:px-8 py-14 max-w-5xl mx-auto">
        <p className="text-[#E8820C] text-xs font-semibold tracking-widest uppercase mb-2">
          Founder
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Himanshu Khudriya</h2>
        <p className="text-slate-600 max-w-2xl mb-6 leading-relaxed">
          B.Tech ECE student at M.L.V. Textile & Engineering College, Bhilwara — building Loomvex
          to bring practical analytics to Indian SMEs that don’t have in-house data teams. Work
          spans Python, SQL, Excel, Tableau, Power BI, and applied dashboards for manufacturing.
        </p>
        <a
          href={PORTFOLIO}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F1624] text-white rounded-xl text-sm font-semibold hover:bg-[#1a2332]"
        >
          View full portfolio →
        </a>
      </section>

      {/* CONTACT */}
      <section id="contact" className="bg-white border-t border-slate-200 px-4 sm:px-8 py-14">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[#E8820C] text-xs font-semibold tracking-widest uppercase mb-2">
            Contact
          </p>
          <h2 className="text-2xl font-bold mb-3">Book a short demo</h2>
          <p className="text-slate-600 text-sm mb-6">
            One week of your existing production data → a live view for management. No heavy ERP.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:jskdatascienceservices@gmail.com"
              className="px-6 py-3 bg-[#E8820C] text-white rounded-xl font-semibold"
            >
              Email for demo
            </a>
            <a
              href={PORTFOLIO}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-slate-300 rounded-xl font-semibold"
            >
              Portfolio
            </a>
            <Link href="/login" className="px-6 py-3 border border-slate-300 rounded-xl font-semibold">
              App login
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-6">
            Replace the email above with your real address if different.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F1624] px-4 sm:px-8 py-6 flex flex-col sm:flex-row justify-between gap-3 text-sm">
        <span className="text-white/50">© Loomvex · Bhilwara, Rajasthan</span>
        <div className="flex gap-4">
          <a href={PORTFOLIO} target="_blank" rel="noopener noreferrer" className="text-[#E8820C]">
            Portfolio
          </a>
          <Link href="/" className="text-white/50 hover:text-white">
            Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}