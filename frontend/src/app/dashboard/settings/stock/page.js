"use client";

import Link from "next/link";

export default function StockSettings() {
  return (
    <div className="space-y-8 animate-fade-in max-w-3xl text-slate-800 font-sans pb-12">
      
      <div className="text-left">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Stock Settings</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure stock tracking rules and terminal ordering limits</p>
      </div>

      <div className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-8">
        
        {/* Header Indicator */}
        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ff5722]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-black text-slate-900">Item-Level Stock Validation</h3>
              <p className="text-[9px] font-black text-[#ff5722] uppercase tracking-widest mt-0.5">Automated Active State</p>
            </div>
          </div>
          <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Live Active
          </span>
        </div>

        {/* Explain the rules in two beautiful cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tracked Card */}
          <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl space-y-3 hover:border-orange-500/20 transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md">
                Strict Track
              </span>
              <span className="text-xs"></span>
            </div>
            <h4 className="text-xs font-black text-slate-900">Tracked Stock Items</h4>
            <p className="text-[11px] text-slate-450 leading-relaxed font-medium">
              If an item is configured to <strong>Track Stock</strong> inside the Catalog, ordering terminals (POS Billing & Diner QR table portals) will strictly block orders that exceed the available stock quantity.
            </p>
          </div>

          {/* Bypassed Card */}
          <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl space-y-3 hover:border-slate-300/40 transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                Bypassed
              </span>
              <span className="text-xs"></span>
            </div>
            <h4 className="text-xs font-black text-slate-900">Untracked Items</h4>
            <p className="text-[11px] text-slate-450 leading-relaxed font-medium">
              If stock tracking is disabled for an item, it can be ordered in unlimited quantities. Stock rules are bypassed, allowing smooth execution for non-physical or pre-made items.
            </p>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl flex items-start gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#ff5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">How to setup Stock rules?</h4>
            <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">
              Navigate to the <strong>Menu Catalog</strong> page under the dashboard, click on any menu item to Edit, and toggle the "Track Stock" preference. You can also edit current stock quantities and cost prices there.
            </p>
          </div>
        </div>

        {/* Action shortcut to Catalog */}
        <div className="flex justify-end pt-2">
          <Link
            href="/dashboard/menu"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 duration-200"
          >
            <span>Go to Menu Catalog</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

      </div>
    </div>
  );
}
