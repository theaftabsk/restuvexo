"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import {
  Utensils,
  Coffee,
  Pizza,
  Store,
  Wine,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Receipt,
  QrCode,
  ChefHat,
  Users,
  BarChart3,
  Flame,
  Check,
  Lock,
  Layers
} from "lucide-react";
import { getBackendUrl } from "@/config/api";

declare global {
  interface Window {
    Cashfree?: any;
  }
}

const CUISINE_OPTIONS = [
  { id: "multi", label: "Multi-Cuisine / Dining", desc: "Full-service dining restaurant", icon: Utensils },
  { id: "cafe", label: "Café & Bakery", desc: "Coffee, pastries, beverages", icon: Coffee },
  { id: "qsr", label: "Fast Food / QSR", desc: "Quick service & take-out counter", icon: Pizza },
  { id: "cloud", label: "Cloud Kitchen", desc: "Delivery-only food business", icon: Store },
  { id: "bar", label: "Restro-Bar & Lounge", desc: "Food, bar drinks & nightlife", icon: Wine },
  { id: "other", label: "Bakery & Desserts", desc: "Specialty food & sweets", icon: Flame }
];

export default function OnboardingPage() {
  const router = useRouter();
  const BACKEND_URL = getBackendUrl();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [restaurant, setRestaurant] = useState<any>(null);

  // Step 1 Form Data
  const [cuisine, setCuisine] = useState<string>("multi");
  const [tableCount, setTableCount] = useState<number>(8);
  const [currencySymbol, setCurrencySymbol] = useState<string>("₹");
  const [taxRate, setTaxRate] = useState<number>(5);
  const [taxName, setTaxName] = useState<string>("GST");

  // Step 2 & 3 Payment Data
  const [paymentSessionId, setPaymentSessionId] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [paymentVerified, setPaymentVerified] = useState<boolean>(false);
  const [createdTables, setCreatedTables] = useState<any[]>([]);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("authToken");
    const storedRest = localStorage.getItem("restaurant");

    if (!token) {
      router.push("/auth/login");
      return;
    }

    if (storedRest) {
      try {
        setRestaurant(JSON.parse(storedRest));
      } catch (e) {}
    }

    // Check URL parameters for Cashfree return redirect
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const cfOrderId = urlParams.get("cf_order_id") || urlParams.get("order_id");
      const urlStep = urlParams.get("step");

      if (urlStep) {
        setStep(parseInt(urlStep, 10));
      }

      if (cfOrderId) {
        setOrderId(cfOrderId);
        setStep(3);
        verifyCashfreePayment(cfOrderId);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Complete Step 1: Initialize Setup
  const handleSaveRestaurantSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/onboarding/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cuisineType: cuisine,
          tableCount,
          currency: "INR",
          currencySymbol,
          taxRate,
          taxName
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize restaurant configuration.");
      }

      if (data.tables) {
        setCreatedTables(data.tables);
      }

      setSuccess("Configuration saved! Moving to 1-Click Launch Offer...");
      setTimeout(() => {
        setSuccess("");
        setStep(2);
      }, 700);

    } catch (err: any) {
      setError(err.message || "Failed to save configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Trigger Cashfree ₹1 Checkout
  const handlePayFirstMonthPromo = async () => {
    setError("");
    setLoading(true);

    const token = localStorage.getItem("authToken");

    try {
      // 1. Create ₹1.00 Order
      const res = await fetch(`${BACKEND_URL}/api/subscription/cashfree/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isRenewal: false })
      });

      const orderData = await res.json();

      if (!orderData.success || !orderData.paymentSessionId) {
        throw new Error(orderData.error || "Failed to initiate ₹1 payment order.");
      }

      setPaymentSessionId(orderData.paymentSessionId);
      setOrderId(orderData.orderId);

      // 2. Ensure Cashfree SDK is available
      let CashfreeSDK = window.Cashfree;
      if (!CashfreeSDK) {
        await new Promise<void>((resolve, reject) => {
          if (window.Cashfree) {
            CashfreeSDK = window.Cashfree;
            return resolve();
          }
          const existingScript = document.querySelector('script[src*="cashfree.com"]');
          if (existingScript) {
            existingScript.addEventListener("load", () => {
              CashfreeSDK = window.Cashfree;
              resolve();
            });
            existingScript.addEventListener("error", () => reject(new Error("Cashfree SDK failed to load")));
          } else {
            const script = document.createElement("script");
            script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
            script.onload = () => {
              CashfreeSDK = window.Cashfree;
              resolve();
            };
            script.onerror = () => reject(new Error("Failed to load Cashfree payment gateway SDK."));
            document.body.appendChild(script);
          }
        });
      }

      const cashfree = CashfreeSDK({ mode: orderData.environment || "production" });

      // Direct Redirect Checkout (Bypasses iframe whitelisting blockers)
      const result = await cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: "_self"
      });

      if (result?.error) {
        setError(result.error.message || "Payment was cancelled. Please try again.");
        setLoading(false);
      }

    } catch (err: any) {
      setError(err.message || "Payment initiation failed.");
      setLoading(false);
    }
  };

  // Step 3: Verify Payment after redirect with auto-retry
  const verifyCashfreePayment = async (orderIdToVerify: string, retries = 3) => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("authToken");

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/subscription/cashfree/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ orderId: orderIdToVerify })
        });

        const verifyData = await res.json();

        if (verifyData.success) {
          setPaymentVerified(true);
          setSuccess("🎉 Payment verified! Your restaurant OS is activated for 30 days.");
          setLoading(false);
          return;
        }

        if (attempt < retries) {
          // Cashfree might take 1-2s to transition status, wait and retry
          await new Promise(r => setTimeout(r, 1500));
        } else {
          setError(verifyData.error || "Payment verification not completed. Please try again.");
        }
      } catch (err: any) {
        if (attempt === retries) {
          setError(err.message || "Payment verification failed.");
        } else {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-[#ff5722] selection:text-white relative overflow-x-hidden">
      {/* Cashfree JS SDK */}
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="lazyOnload" />

      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md overflow-hidden p-1.5">
            <img src="/restuvexo_logo.png" alt="RESTUVEXO Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-black text-xl tracking-tight text-white">RESTUVEXO</span>
              <span className="w-2 h-2 rounded-full bg-[#ff5722]" />
            </div>
            <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Restaurant Setup Wizard</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{restaurant?.name || "Restaurant Setup"}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-3xl mx-auto px-6 py-4 flex-1 flex flex-col justify-center">
        
        {/* Stepper Indicator */}
        <div className="w-full max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-[#ff5722] to-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
            />

            {/* Step 1 Pill */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  step >= 1
                    ? "bg-[#ff5722] text-white ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4" /> : "1"}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${step >= 1 ? "text-orange-400" : "text-slate-500"}`}>
                Setup
              </span>
            </div>

            {/* Step 2 Pill */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  step >= 2
                    ? "bg-[#ff5722] text-white ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/30"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {step > 2 ? <Check className="w-4 h-4" /> : "2"}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${step >= 2 ? "text-orange-400" : "text-slate-500"}`}>
                ₹1 Activation
              </span>
            </div>

            {/* Step 3 Pill */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  step === 3
                    ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/30"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                3
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${step === 3 ? "text-emerald-400" : "text-slate-500"}`}>
                Launch
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs font-bold flex items-center gap-3 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs font-bold flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1: RESTAURANT PROFILE CONFIGURATION */}
        {step === 1 && (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-fade-in text-left">
            <div className="text-center max-w-md mx-auto mb-8">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-950/60 border border-orange-800/50 px-3 py-1 rounded-full inline-block mb-2">
                Step 1 of 3
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Configure Your Restaurant</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Tell us about your setup to generate smart tables, QR menus, and default categories.
              </p>
            </div>

            <form onSubmit={handleSaveRestaurantSetup} className="space-y-6">
              {/* Cuisine Format Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-3">
                  Select Business Format / Cuisine
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CUISINE_OPTIONS.map((c) => {
                    const Icon = c.icon;
                    const isSelected = cuisine === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCuisine(c.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? "bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-[#ff5722] text-white shadow-lg shadow-orange-500/10 scale-[1.02]"
                            : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-5 h-5 ${isSelected ? "text-[#ff5722]" : "text-slate-400"}`} />
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#ff5722]" />}
                        </div>
                        <div>
                          <p className="text-xs font-black leading-tight text-slate-100">{c.label}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 line-clamp-1">{c.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table Count Selector */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-200 block">
                      Initial Dining Tables Count
                    </label>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      We will automatically generate QR codes and floor layout for each table.
                    </p>
                  </div>
                  <span className="text-2xl font-black text-[#ff5722] bg-orange-950/60 px-4 py-1.5 rounded-xl border border-orange-800/40">
                    {tableCount}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2 mt-4">
                  {[4, 6, 8, 12, 16, 24].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setTableCount(num)}
                      className={`py-2 rounded-xl text-xs font-black transition ${
                        tableCount === num
                          ? "bg-[#ff5722] text-white shadow-md shadow-orange-500/20"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency & Tax Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 text-white text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#ff5722] font-bold"
                    placeholder="₹"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Tax / GST Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full bg-slate-800/60 border border-slate-700 text-white text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#ff5722] font-bold"
                    placeholder="5"
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#ff5722] to-[#e04c1d] hover:from-[#e04c1d] hover:to-[#c83e14] text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-orange-500/25 active:scale-[0.99] transition flex items-center justify-center gap-2 mt-4"
              >
                {loading ? "Saving Setup..." : "Save & Continue to ₹1 Launch Offer →"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: ₹1 FIRST MONTH LAUNCH PROMO (CASHFREE) */}
        {step === 2 && (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-fade-in text-left">
            <div className="text-center max-w-md mx-auto mb-6">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full inline-block mb-2">
                Special Early Adopter Offer
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Launch Your Restaurant OS</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Get full 30 days unrestricted access to the complete RESTUVEXO Growth Suite.
              </p>
            </div>

            {/* Launch Offer Promo Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-800/90 via-slate-900/90 to-slate-950 border border-orange-500/30 p-6 sm:p-8 shadow-xl mb-6">
              <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-36 h-36 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#ff5722] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Growth Plan
                    </span>
                    <span className="text-xs font-bold text-slate-400">First 30 Days Launch Offer</span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">Complete Restaurant Operating System</h3>
                </div>

                <div className="text-left sm:text-right">
                  <div className="flex items-baseline gap-1.5 sm:justify-end">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400">₹1.00</span>
                    <span className="text-xs font-bold text-slate-500 line-through">₹999/mo</span>
                  </div>
                  <p className="text-[10px] font-bold text-orange-400">Save 99.9% on First Month</p>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-6 text-xs">
                <div className="flex items-center gap-2.5 text-slate-200 font-bold">
                  <Receipt className="w-4 h-4 text-[#ff5722] shrink-0" />
                  <span>Blazing Fast POS Billing Terminal</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200 font-bold">
                  <QrCode className="w-4 h-4 text-[#ff5722] shrink-0" />
                  <span>Contactless Table QR Menus</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200 font-bold">
                  <ChefHat className="w-4 h-4 text-[#ff5722] shrink-0" />
                  <span>Live Kitchen Display System (KDS)</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200 font-bold">
                  <Users className="w-4 h-4 text-[#ff5722] shrink-0" />
                  <span>Staff & Waiter Terminals (10-Digit ID)</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200 font-bold">
                  <BarChart3 className="w-4 h-4 text-[#ff5722] shrink-0" />
                  <span>Real-Time Sales & Revenue Analytics</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200 font-bold">
                  <Layers className="w-4 h-4 text-[#ff5722] shrink-0" />
                  <span>Live Stock & Expense Tracking</span>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePayFirstMonthPromo}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm uppercase tracking-widest py-4.5 rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-[0.99] transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
                <span>{loading ? "Connecting to Cashfree..." : "Pay ₹1.00 & Launch Restaurant OS"}</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Powered by Cashfree Payments • 100% Secure SSL 256-bit Encryption</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CELEBRATION & ENTER DASHBOARD */}
        {step === 3 && (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-fade-in text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 mb-5 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full inline-block mb-3">
              Setup Completed Successfully
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {restaurant?.name || "Your Restaurant"} is Live!
            </h2>
            <p className="text-xs text-slate-300 font-semibold max-w-md mx-auto mt-2 leading-relaxed">
              Your tables, digital QR menu engine, POS billing terminal, and Kitchen Display System are now fully operational.
            </p>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 max-w-md mx-auto my-6 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Subscription Status:</span>
                <span className="text-emerald-400 font-black flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active (30 Days)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Assigned Tables:</span>
                <span className="text-white font-bold">{tableCount} Tables with Smart QR Codes</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Currency & Tax:</span>
                <span className="text-white font-bold">{currencySymbol} ({taxRate}% {taxName})</span>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full max-w-md bg-gradient-to-r from-[#ff5722] to-[#e04c1d] hover:from-[#e04c1d] hover:to-[#c83e14] text-white font-black text-xs uppercase tracking-widest py-4.5 rounded-2xl shadow-xl shadow-orange-500/25 active:scale-[0.99] transition"
            >
              <span>Enter Owner Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 text-center text-slate-500 text-[11px] font-semibold">
        © 2026 RESTUVEXO Inc. • Multi-Tenant Restaurant Operating System (ROS)
      </footer>
    </div>
  );
}
