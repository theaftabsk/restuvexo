"use client";
import { useState, useEffect } from "react";

export default function RestaurantSettings() {
  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    const storedRest = localStorage.getItem("restaurant");
    if (storedRest) setRestaurant(JSON.parse(storedRest));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl text-slate-800 font-sans">
      <div className="text-left">
        <h2 className="text-2xl font-black text-slate-900">Restaurant Info</h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Operating business details</p>
      </div>
      
      <div className="space-y-8">
        <div className="flex items-center gap-6 pb-6 border-b border-slate-100 text-left">
          <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-600 shadow-inner border border-slate-200">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">{restaurant?.name || "Loading..."}</h3>
            <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/10">
              Licensed Business
            </span>
          </div>
        </div>
        
        <div className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Operating Address</label>
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700">
              {restaurant?.address || "Address not provided"}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">POS License Key</label>
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-mono text-slate-500 blur-sm hover:blur-none transition cursor-pointer" title="Hover to reveal">
              LIC-RESTUVEXO-2026-X9A4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
