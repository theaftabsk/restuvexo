"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Utensils,
  Layers,
  ChefHat,
  BarChart3,
  Users
} from "lucide-react";

export default function PublicPricingPage() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const [plans, setPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/subscription/plans`)
      .then((r) => r.json())
      .then((d) => setPlans(d || []))
      .catch(() => {});
  }, [BACKEND_URL]);

  return (
    <div className="min-h-screen bg-[#fcfdfd] text-slate-900 font-sans selection:bg-[#ff5722] selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm p-1.5 flex items-center justify-center">
              <img src="/restuvexo_logo.png" alt="RESTUVEXO Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-slate-900">RESTUVEXO</span>
              <span className="block text-[8px] font-black text-[#ff5722] uppercase tracking-widest">
                ROS SaaS Platform
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 transition"
            >
              Sign In
            </Link>
            <Link
              href="/checkout?plan=Growth"
              className="px-5 py-2.5 bg-slate-900 hover:bg-[#ff5722] text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md active:scale-95"
            >
              Start for ₹1
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center space-y-4">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 text-[#ff5722] text-xs font-black uppercase tracking-widest border border-orange-100 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Special Launch Offer: ₹1 First Month on All Plans
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
          Simple, Transparent Pricing for Modern Restaurants
        </h1>
        <p className="text-sm md:text-base font-semibold text-slate-500 max-w-2xl mx-auto">
          POS billing, kitchen display (KDS), digital QR menu ordering, recipe BOM inventory, and real-time P&L telemetry.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="pt-6 flex items-center justify-center gap-3">
          <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 inline-flex items-center text-xs font-black">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-xl transition ${
                billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                billingCycle === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Annual (2 Months Free)</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing 3 Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Starter Plan */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Starter Tier</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Starter</h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Ideal for small cafes, juice bars, and quick takeaway counters.
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">₹499</span>
                  <span className="text-xs font-bold text-slate-400">/ month</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-black rounded-full border border-emerald-200">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  <span>First month: Only ₹1</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100 text-xs font-bold text-slate-650">
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Fast POS Walk-in Billing</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instant 80mm/58mm Thermal Print</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Up to 10 Dining Tables</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Up to 3 Staff Accounts</span>
                </p>
                <p className="flex items-center gap-2.5 text-slate-400">
                  <span className="w-4 h-4 text-center font-black">✕</span>
                  <span>Kitchen KDS Display</span>
                </p>
                <p className="flex items-center gap-2.5 text-slate-400">
                  <span className="w-4 h-4 text-center font-black">✕</span>
                  <span>Recipe BOM Inventory</span>
                </p>
              </div>
            </div>

            <Link
              href="/checkout?plan=Starter"
              className="mt-8 w-full py-4 bg-slate-900 hover:bg-[#ff5722] text-white text-xs font-black uppercase tracking-widest rounded-2xl text-center shadow-lg transition active:scale-95 block"
            >
              Start Starter for ₹1
            </Link>
          </div>

          {/* Growth Plan (Most Popular) */}
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl relative border-2 border-[#ff5722] transform md:-translate-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#ff5722] to-[#ff7a47] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
              Most Popular Choice
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-[#ff5722]">Growth Tier</span>
                <h2 className="text-2xl font-black text-white mt-1">Growth</h2>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Complete operating system for busy dine-in bistros & restaurants.
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">₹999</span>
                  <span className="text-xs font-bold text-slate-400">/ month</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-orange-300 text-[11px] font-black rounded-full border border-white/10">
                  <Zap className="w-3 h-3 text-[#ff5722]" />
                  <span>First month: Only ₹1</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-800 text-xs font-bold text-slate-200">
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Fast POS Walk-in Billing</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Kitchen Display System (KDS) & Chimes</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Up to 30 Dining Tables & Standee QRs</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Recipe BOM & Raw Inventory Ledger</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Up to 10 Staff & Waiter PIN Accounts</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>P&L Analytics & Expense Tracker</span>
                </p>
              </div>
            </div>

            <Link
              href="/checkout?plan=Growth"
              className="mt-8 w-full py-4 bg-gradient-to-r from-[#ff5722] to-[#ff7a47] hover:opacity-95 text-white text-xs font-black uppercase tracking-widest rounded-2xl text-center shadow-xl shadow-orange-500/30 transition active:scale-95 block"
            >
              Start Growth for ₹1
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Pro Enterprise</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Pro</h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  For large food chains, high-volume banquet halls & multi-branch kitchens.
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">₹1,999</span>
                  <span className="text-xs font-bold text-slate-400">/ month</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-black rounded-full border border-emerald-200">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  <span>First month: Only ₹1</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100 text-xs font-bold text-slate-650">
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Unlimited Tables & Standees</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Unlimited Waiter & Kitchen Accounts</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Multi-Outlet Management Ready</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dedicated Account Manager & Priority 24/7</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Full Recipe BOM & Low Stock Alerts</span>
                </p>
              </div>
            </div>

            <Link
              href="/checkout?plan=Pro"
              className="mt-8 w-full py-4 bg-slate-900 hover:bg-[#ff5722] text-white text-xs font-black uppercase tracking-widest rounded-2xl text-center shadow-lg transition active:scale-95 block"
            >
              Start Pro for ₹1
            </Link>
          </div>
        </div>
      </section>

      {/* Transparent FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-24 space-y-8">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-slate-900">Frequently Asked Questions</h3>
          <p className="text-xs font-semibold text-slate-400">Everything you need to know about the ₹1 first month offer</p>
        </div>

        <div className="space-y-4 text-xs font-semibold text-slate-600">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-sm">
            <h4 className="text-sm font-black text-slate-900">How does the ₹1 First Month offer work?</h4>
            <p>
              When you sign up, you only pay ₹1 today to activate your full cloud suite. You get 30 full days of unrestricted access. At the end of 30 days, your plan renews at the regular monthly price (e.g. ₹999 for Growth).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-sm">
            <h4 className="text-sm font-black text-slate-900">What payment methods are supported?</h4>
            <p>
              We use Cashfree Payment Gateway to support instant UPI (Google Pay, PhonePe, Paytm, BHIM), all Debit & Credit cards, and NetBanking from 50+ Indian banks.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-sm">
            <h4 className="text-sm font-black text-slate-900">What happens if my payment is late?</h4>
            <p>
              We give you a generous 7-day grace period where your restaurant operations continue uninterrupted. Even if you renew during grace, your historical menu, tables, and sales data are 100% safely preserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
