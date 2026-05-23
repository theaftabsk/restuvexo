"use client";
import { useState, useEffect } from "react";

export default function AccountSettings() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Account Details</h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Manage your personal credentials</p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Full Name</label>
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700">
              {user?.name || "Loading..."}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Mobile Number</label>
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700">
              {user?.phone || "Loading..."}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">System Role</label>
            <div className="px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm font-black text-emerald-600 uppercase tracking-widest">
              {user?.role || "Staff"}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Account Status</label>
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </div>
          </div>
        </div>
        
        <div className="pt-6 mt-4 border-t border-slate-100">
          <button className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-slate-900/20">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
