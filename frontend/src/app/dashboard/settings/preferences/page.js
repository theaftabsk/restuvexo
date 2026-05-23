"use client";

import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function PreferencesSettings() {
  const [enableQrOrdering, setEnableQrOrdering] = useState(true);
  const [sidebarQuickActions, setSidebarQuickActions] = useState(true);
  const [sidebarStoreSwitch, setSidebarStoreSwitch] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEnableQrOrdering(data.qrOrderingEnabled !== false);
          setSidebarQuickActions(data.sidebarQuickActions !== false);
          setSidebarStoreSwitch(data.sidebarStoreSwitch !== false);
        }
      } catch (e) {
        console.error("Failed to load settings from server:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSetting = async (key, val) => {
    const token = localStorage.getItem("authToken");
    try {
      const payload = {
        [key]: val
      };

      const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
      }
    } catch (e) {
      console.error("Failed to persist settings on server:", e);
    }
  };


  const handleToggleQrOrdering = () => {
    setEnableQrOrdering(prev => {
      const next = !prev;
      saveSetting("qrOrderingEnabled", next);
      return next;
    });
  };

  if (loading) {
    return <LoadingScreen message="Loading dashboard preferences..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-16">
      
      {/* Dynamic Saved Toast */}
      {isSaved && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className="bg-emerald-500/10 border border-emerald-500/25 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-emerald-600 backdrop-blur-xl">
            <span className="text-xs"></span>
            <p className="text-[11px] font-black tracking-wide uppercase">Preferences updated live!</p>
          </div>
        </div>
      )}

      <div className="text-left">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Preferences</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure terminal parameters and ordering constraints</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-6">
          
          {/* Header Indicator */}
          <div className="flex items-center justify-between border-b border-slate-50 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-900">POS & Customer Controls</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Terminal rule settings</p>
              </div>
            </div>
          </div>

          {/* Preference Config Row 1: Customer QR Self-Ordering Toggle */}
          <div className="flex items-center justify-between gap-6 p-4 rounded-2xl hover:bg-slate-50/80 transition duration-300">
            <div className="space-y-1.5 max-w-md text-left">
              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Customer QR Self-Ordering Portal
              </p>
              <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
                When ENABLED, visitors scanning their table QR code can place in-store food orders directly from their phones. If DISABLED, it acts as a View-Only digital menu.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleToggleQrOrdering}
              className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${enableQrOrdering ? "bg-[#ff5722]" : "bg-slate-200"}`}
            >
              <span className={`inline-block h-5.5 w-5.5 transform rounded-full bg-white transition-transform duration-300 ${enableQrOrdering ? "translate-x-6.5" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Preference Config Row 3: Sidebar Store Status switch toggle visibility */}
          <div className="flex items-center justify-between gap-6 p-4 rounded-2xl hover:bg-slate-50/80 transition duration-300 border-t border-slate-100/60 pt-5 mt-2">
            <div className="space-y-1.5 max-w-md text-left">
              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Show Store Status Toggle on Sidebar
              </p>
              <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
                When ENABLED, the main sidebar header renders the green/amber "Accepting Orders" status button allowing real-time ordering pause. When DISABLED, it is hidden from the sidebar.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const next = !sidebarStoreSwitch;
                setSidebarStoreSwitch(next);
                saveSetting("sidebarStoreSwitch", next);
              }}
              className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${sidebarStoreSwitch ? "bg-[#ff5722]" : "bg-slate-200"}`}
            >
              <span className={`inline-block h-5.5 w-5.5 transform rounded-full bg-white transition-transform duration-300 ${sidebarStoreSwitch ? "translate-x-6.5" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Preference Config Row 4: Sidebar Quick Actions Panel visibility */}
          <div className="flex items-center justify-between gap-6 p-4 rounded-2xl hover:bg-slate-50/80 transition duration-300 border-t border-slate-100/60 pt-5 mt-2">
            <div className="space-y-1.5 max-w-md text-left">
              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Show Quick Actions () Panel on Sidebar
              </p>
              <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
                When ENABLED, the black " Quick Action" dropdown button is rendered under the owner workspace header. If DISABLED, this button is hidden.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const next = !sidebarQuickActions;
                setSidebarQuickActions(next);
                saveSetting("sidebarQuickActions", next);
              }}
              className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${sidebarQuickActions ? "bg-[#ff5722]" : "bg-slate-200"}`}
            >
              <span className={`inline-block h-5.5 w-5.5 transform rounded-full bg-white transition-transform duration-300 ${sidebarQuickActions ? "translate-x-6.5" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Info card */}
          <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex items-start gap-3.5 text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Interactive Synced State</h4>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Any changes made to these rules will immediately propagate live to the active [POS Billing Terminal] and [QR Table Orders] without requiring session reloads.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
