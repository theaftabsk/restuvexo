"use client";

import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function BillingSettings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchSettings = async () => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSelectPlan = async (planName) => {
    if (isUpdating) return;
    setIsUpdating(true);
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionPlan: planName,
          subscriptionStatus: "active" // Reactivate
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSuccessMessage(`Successfully switched to ${planName.toUpperCase()} Plan!`);
        
        // Trigger a custom event to notify parent layout/sidebar of telemetry updates
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("subscription_updated"));
        }

        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        alert("Failed to update plan. Please try again.");
      }
    } catch (err) {
      console.error("Plan update failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading billing profile..." minHeight="50vh" />;
  }

  // Calculate Trial Remaining
  let trialDaysLeft = 0;
  let isTrialActive = false;
  if (settings?.subscriptionPlan === "trial" && settings?.trialEndsAt) {
    const diff = new Date(settings.trialEndsAt).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    isTrialActive = diff > 0;
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-16">
      
      {/* Toast Success Notification */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className="bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border border-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-[11px] font-black tracking-wide uppercase">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Subscriptions</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Upgrade plans, audit trial states, and unlock operational modules</p>
        </div>
        
        {/* Active Plan Badge */}
        <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl flex items-center gap-3 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="text-left">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Current Plan</p>
            <p className="text-xs font-black text-slate-850 uppercase mt-0.5">
              {settings?.subscriptionPlan === "trial" ? `7-Day Trial (${trialDaysLeft} days left)` : `${settings?.subscriptionPlan} plan`}
            </p>
          </div>
        </div>
      </div>

      {/* Trial Countdown Card */}
      {settings?.subscriptionPlan === "trial" && (
        <div className={`p-6 rounded-[2rem] border transition-all duration-300 ${
          isTrialActive 
            ? "bg-gradient-to-r from-orange-50 to-orange-100/50 border-orange-100 text-orange-850" 
            : "bg-gradient-to-r from-rose-50 to-rose-100/50 border-rose-100 text-rose-850"
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-left">
            <div className="space-y-1.5">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                isTrialActive ? "bg-orange-100 border-orange-200 text-orange-700" : "bg-rose-100 border-rose-200 text-rose-700"
              }`}>
                {isTrialActive ? "Free Trial Running" : "Trial Expired"}
              </span>
              <h3 className="text-lg font-black tracking-tight mt-2">
                {isTrialActive 
                  ? `Your free trial expires in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}.`
                  : "Your 7-Day Free Trial has expired and system access is locked."
                }
              </h3>
              <p className="text-xs font-medium opacity-80 max-w-xl">
                Please subscribe to one of our premium plans below to keep your high-speed POS billing, digital QR menu ordering, and kitchen display terminals running smoothly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        
        {/* Basic Plan Selection */}
        <div className={`bg-white border rounded-[2rem] p-6 md:p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative ${
          settings?.subscriptionPlan === "basic" ? "border-orange-500 border-2" : "border-slate-200/80"
        }`}>
          {settings?.subscriptionPlan === "basic" && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Active Plan
            </div>
          )}
          <div className="space-y-6 text-left">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">Cafes & Trucks</span>
              <h3 className="text-xl font-black text-slate-900 mt-3">Basic Plan</h3>
              <p className="text-slate-400 text-xs mt-1">Perfect for small outlets and cafes.</p>
            </div>

            <div className="flex items-baseline gap-1 border-b border-slate-100 pb-5">
              <span className="text-3xl font-black text-slate-900">₹499</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ month</span>
            </div>

            <ul className="space-y-3 text-xs font-semibold text-slate-600">
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>1 Active Outlet</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>High-Speed POS Billing</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>View-Only QR Menu</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400 line-through">
                <span className="shrink-0 w-4 h-4 flex items-center justify-center font-black">×</span>
                <span>Customer QR Self-Ordering</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400 line-through">
                <span className="shrink-0 w-4 h-4 flex items-center justify-center font-black">×</span>
                <span>Staff & Security Terminals</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400 line-through">
                <span className="shrink-0 w-4 h-4 flex items-center justify-center font-black">×</span>
                <span>VexoAI Chatbot Assistant</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectPlan("basic")}
              disabled={isUpdating || settings?.subscriptionPlan === "basic"}
              className={`w-full py-3 px-4 font-black uppercase tracking-wider rounded-2xl text-[10px] transition-all cursor-pointer ${
                settings?.subscriptionPlan === "basic"
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {settings?.subscriptionPlan === "basic" ? "Active" : "Activate Basic"}
            </button>
          </div>
        </div>

        {/* Pro Plan Selection */}
        <div className={`bg-white border rounded-[2rem] p-6 md:p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative ${
          settings?.subscriptionPlan === "pro" ? "border-orange-500 border-2" : "border-slate-200/80 shadow-md"
        }`}>
          {settings?.subscriptionPlan === "pro" && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Active Plan
            </div>
          )}
          <div className="space-y-6 text-left">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">Most Popular</span>
              <h3 className="text-xl font-black text-slate-900 mt-3">Pro Plan</h3>
              <p className="text-slate-400 text-xs mt-1">Advanced controls for full-service bistros.</p>
            </div>

            <div className="flex items-baseline gap-1 border-b border-slate-100 pb-5">
              <span className="text-3xl font-black text-slate-900">₹1,499</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ month</span>
            </div>

            <ul className="space-y-3 text-xs font-semibold text-slate-600">
              <li className="flex items-center gap-2.5 text-orange-600 font-extrabold">
                <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Everything in Basic</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited Staff Terminals</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Customer QR Self-Ordering</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Recipe Stock Control</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>VexoAI Chatbot Assistant</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectPlan("pro")}
              disabled={isUpdating || settings?.subscriptionPlan === "pro"}
              className={`w-full py-3 px-4 font-black uppercase tracking-wider rounded-2xl text-[10px] transition-all cursor-pointer ${
                settings?.subscriptionPlan === "pro"
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {settings?.subscriptionPlan === "pro" ? "Active" : "Activate Pro"}
            </button>
          </div>
        </div>

        {/* Custom Plan Card */}
        <div className="bg-white border border-slate-200/85 rounded-[2rem] p-6 md:p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative">
          <div className="space-y-6 text-left">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">Franchises</span>
              <h3 className="text-xl font-black text-slate-900 mt-3">Custom Plan</h3>
              <p className="text-slate-400 text-xs mt-1">Enterprise features for large chains.</p>
            </div>

            <div className="flex items-baseline gap-1 border-b border-slate-100 pb-5">
              <span className="text-3xl font-black text-slate-900">Custom</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ business</span>
            </div>

            <ul className="space-y-3 text-xs font-semibold text-slate-650">
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Multi-Outlet Sync</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Dedicated Success Mgr</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Custom API Integrations</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <a
              href="mailto:support@restuvexo.shop?subject=Upgrade to Custom Plan"
              className="w-full inline-flex py-3 px-4 font-black uppercase tracking-wider rounded-2xl text-[10px] transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 items-center justify-center"
            >
              Contact Sales
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}
