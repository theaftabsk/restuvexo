"use client";

import { getBackendUrl } from "@/config/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SettingsLayout({ children }) {
  const pathname = usePathname();
  const [sidebarTheme, setSidebarTheme] = useState('light');

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    fetch(`${getBackendUrl()}/api/dashboard/sidebar-telemetry?_=${Date.now()}`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: 'no-store'
    })
      .then(res => res.json())
      .then(data => {
        setSidebarTheme('light');
      })
      .catch(err => console.error("Error loading sidebar theme in settings:", err));
  }, []);

  const tabs = [
    { 
      id: "account", 
      label: "My Account", 
      desc: "Profile & credentials", 
      path: "/dashboard/settings/account",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      id: "restaurant", 
      label: "Restaurant Info", 
      desc: "Business details", 
      path: "/dashboard/settings/restaurant",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    { 
      id: "stock", 
      label: "Stock Control", 
      desc: "Inventory settings", 
      path: "/dashboard/settings/stock",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    { 
      id: "security", 
      label: "Anti-Spam Firewall", 
      desc: "Blocked devices", 
      path: "/dashboard/settings/security",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      id: "preferences", 
      label: "Preferences", 
      desc: "System settings", 
      path: "/dashboard/settings/preferences",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const getTabStyles = (isActive) => {
    if (sidebarTheme === 'dark') {
      return {
        link: isActive 
          ? "bg-gradient-to-r from-amber-400 to-amber-500 border-transparent text-slate-950 shadow-md shadow-amber-500/10 translate-x-1.5" 
          : "bg-slate-900 hover:bg-slate-800/80 border border-slate-800/60 text-slate-400 hover:text-white hover:translate-x-1",
        iconContainer: isActive
          ? "bg-slate-950 text-amber-500 shadow-sm"
          : "bg-slate-950 border border-slate-850 text-slate-400 group-hover:text-amber-500 group-hover:border-amber-500/20",
        label: isActive ? "text-slate-950 font-black" : "text-slate-400 group-hover:text-white font-black",
        desc: isActive ? "text-slate-950/80 font-bold" : "text-slate-500 font-bold"
      };
    } else {
      return {
        link: isActive 
          ? "bg-gradient-to-r from-[#ff5722] to-[#ff7a47] border-transparent text-white shadow-md shadow-orange-500/15 translate-x-1.5" 
          : "bg-white hover:bg-slate-50/60 border border-slate-100 text-slate-500 hover:text-slate-900 hover:translate-x-1",
        iconContainer: isActive
          ? "bg-white text-[#ff5722] shadow-sm"
          : "bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-white group-hover:border-slate-200 group-hover:text-slate-800",
        label: isActive ? "text-white font-black" : "text-slate-600 group-hover:text-slate-900 font-black",
        desc: isActive ? "text-white/80 font-bold" : "text-slate-400 font-bold"
      };
    }
  };

  const headerColor = sidebarTheme === 'dark' ? 'text-white' : 'text-slate-900';
  const subHeaderColor = sidebarTheme === 'dark' ? 'text-slate-400' : 'text-slate-450';
  const canvasBg = sidebarTheme === 'dark' ? 'bg-slate-950 border border-slate-900 text-slate-100 shadow-xl shadow-slate-950/50' : 'bg-white border border-slate-200 text-slate-800 shadow-xl shadow-slate-100/50';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-left">
        <h1 className={`text-3xl font-black tracking-tight ${headerColor}`}>Settings Console</h1>
        <p className={`text-xs font-bold mt-1 uppercase tracking-wider ${subHeaderColor}`}>Manage your restaurant workspace and security</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Premium Inner Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {tabs.map(tab => {
            const isActive = pathname.startsWith(tab.path);
            const style = getTabStyles(isActive);
            return (
              <Link 
                href={tab.path} 
                key={tab.id}
                className={`w-full text-left p-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 group border ${style.link}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm transition-colors ${style.iconContainer}`}>
                  {tab.icon}
                </div>
                <div>
                  <p className={`text-xs tracking-wide ${style.label}`}>
                    {tab.label}
                  </p>
                  <p className={`text-[9px] mt-0.5 uppercase tracking-wider ${style.desc}`}>{tab.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Content Canvas */}
        <div className={`flex-1 rounded-[2rem] p-6 md:p-8 min-h-[500px] transition-colors duration-300 ${canvasBg}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
