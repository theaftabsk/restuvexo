"use client";

import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function BillingSettings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
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

  const isExpired = settings?.subscriptionStatus === "expired" || (settings?.subscriptionPlan === "trial" && !isTrialActive);

  // List of all system modules and their metadata
  const featureMeta = [
    { key: "posBilling", name: "High-Speed POS Billing & Invoicing", desc: "Fast order logging, KOT generation, and print receipts." },
    { key: "qrOrdering", name: "Customer QR Self-Ordering Portal", desc: "Let customers scan table QR codes to browse menu and order." },
    { key: "kds", name: "Kitchen Display System (KDS)", desc: "Real-time kitchen order tracking terminals for chefs." },
    { key: "inventory", name: "Inventory Stock & Recipe Control", desc: "Deduct stock automatically based on recipes and ingredients." },
    { key: "vexoAI", name: "VexoAI Chatbot Assistant", desc: "Interact with an AI assistant to get menu & operational insights." },
    { key: "whatsappAPI", name: "WhatsApp Automated Alerts API", desc: "Send automated billing alerts & notifications directly to guests." },
    { key: "staffManagement", name: "Unlimited Staff & Terminals", desc: "Authorize multiple waiters, managers, and cashiers." },
    { key: "multiBranch", name: "Multi-Branch Operations", desc: "Sync and manage multiple outlets from a single dashboard." },
    { key: "analytics", name: "Business Analytics & OPEX Expense Ledger", desc: "In-depth sales metrics, cost analysis, and profit statements." },
    { key: "thermalPrinter", name: "Direct Thermal Printer Support", desc: "Print kitchen tickets & invoices directly to 80mm/58mm printers." }
  ];

  const getPlanBadgeText = () => {
    if (settings?.subscriptionPlan === "trial") {
      return isTrialActive ? `Free Trial (${trialDaysLeft} days left)` : "Free Trial Expired";
    }
    if (settings?.subscriptionPlan === "lifetime") {
      return "Lifetime Premium Access";
    }
    return "Custom Feature-Based Package";
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-16 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 text-left">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Subscriptions</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit active modules, review pricing agreements, and manage trial status</p>
        </div>
        
        {/* Active Plan Badge */}
        <div className="bg-slate-50 border border-slate-200/80 px-4.5 py-3 rounded-2xl flex items-center gap-3 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${isExpired ? "bg-rose-500 animate-pulse" : "bg-emerald-500 animate-pulse-glow"} shrink-0`} />
          <div className="text-left">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Subscription Status</p>
            <p className="text-xs font-black text-slate-850 uppercase mt-1">
              {getPlanBadgeText()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Alert Notification for expired or trial states */}
      {isExpired ? (
        <div className="p-6 rounded-[2rem] border bg-gradient-to-r from-rose-50 to-rose-100/40 border-rose-100 text-rose-900 text-left">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-700">
                Action Required
              </span>
              <h3 className="text-lg font-black tracking-tight mt-1.5">
                Your System Subscription Has Expired
              </h3>
              <p className="text-xs font-medium opacity-85 max-w-2xl leading-relaxed">
                Access to your POS billing terminal, live order queue, KDS feed, and business metrics is currently locked. To activate your custom package and restore full system access, please contact the RESTUVEXO Team.
              </p>
            </div>
            <a
              href="mailto:support@restuvexo.shop?subject=Reactivate RESTUVEXO Account"
              className="inline-flex py-3 px-6 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black uppercase tracking-wider rounded-2xl text-[10px] shadow-lg shadow-rose-600/10 transition-all active:scale-95 whitespace-nowrap"
            >
              Contact RESTUVEXO Team
            </a>
          </div>
        </div>
      ) : settings?.subscriptionPlan === "trial" ? (
        <div className="p-6 rounded-[2rem] border bg-gradient-to-r from-orange-50 to-orange-100/40 border-orange-100 text-orange-950 text-left">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-700">
                Free Trial Running
              </span>
              <h3 className="text-lg font-black tracking-tight mt-1.5">
                Your 7-Day Free Trial Expires in {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"}
              </h3>
              <p className="text-xs font-medium opacity-85 max-w-2xl leading-relaxed">
                You are currently previewing RESTUVEXO. All modules are enabled by default for you to evaluate the platform. Once your trial ends, you will need to contact us to establish a custom monthly agreement.
              </p>
            </div>
            <a
              href="mailto:support@restuvexo.shop?subject=Setup Custom Package"
              className="inline-flex py-3 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider rounded-2xl text-[10px] shadow-lg shadow-orange-500/10 transition-all active:scale-95 whitespace-nowrap"
            >
              Contact RESTUVEXO Team
            </a>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start text-left">
        
        {/* Custom Pricing Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-orange-600 text-white text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
              Contracted
            </div>
            
            <div className="space-y-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">Custom SaaS Model</span>
              <h3 className="text-xl font-black text-slate-900 mt-2">Agreed Pricing</h3>
              <p className="text-slate-400 text-xs">Tailored to your specific restaurant modules.</p>
            </div>

            <div className="flex items-baseline gap-1.5 border-b border-slate-100 pb-5">
              <span className="text-4xl font-black text-slate-900">
                ₹{settings?.customPrice !== undefined ? Number(settings.customPrice).toLocaleString('en-IN') : "0"}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ month</span>
            </div>

            {settings?.customNotes && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Administrative Notes</span>
                <p className="text-[11px] text-slate-600 font-semibold leading-relaxed whitespace-pre-line">
                  {settings.customNotes}
                </p>
              </div>
            )}

            <div className="pt-2 text-center">
              <a
                href="mailto:support@restuvexo.shop?subject=Modify Custom Contract"
                className="w-full inline-flex py-3.5 px-4 font-black uppercase tracking-wider rounded-2xl text-[10px] transition-all bg-slate-900 text-white hover:bg-slate-800 items-center justify-center shadow-lg shadow-slate-900/10 active:scale-95 cursor-pointer"
              >
                Change Contract / Modules
              </a>
            </div>
          </div>
        </div>

        {/* Feature-Based Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-6">
            <div className="border-b border-slate-50 pb-4">
              <h3 className="text-lg font-black text-slate-900">Custom Module Matrix</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Real-time status of features configured by administration</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featureMeta.map((feat) => {
                const isEnabled = settings?.enabledFeatures?.[feat.key] !== false;
                return (
                  <div 
                    key={feat.key} 
                    className={`p-4.5 rounded-2.5xl border transition-all duration-300 flex items-start gap-3.5 ${
                      isEnabled 
                        ? "bg-emerald-50/20 border-emerald-100/80 shadow-sm shadow-emerald-500/5" 
                        : "bg-slate-50/50 border-slate-100 opacity-60"
                    }`}
                  >
                    {isEnabled ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                    )}
                    <div className="space-y-0.5">
                      <p className={`text-xs font-black tracking-tight ${isEnabled ? "text-slate-900" : "text-slate-500"}`}>
                        {feat.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                        {feat.desc}
                      </p>
                      <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1.5 ${
                        isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        {isEnabled ? "ACTIVE" : "LOCKED"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
