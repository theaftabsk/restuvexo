"use client";

import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function SuperAdminPanel() {
  const [passkey, setPasskey] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Check session storage for existing auth
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = sessionStorage.getItem("super_admin_key");
      if (storedKey) {
        setPasskey(storedKey);
        verifyAndFetch(storedKey);
      }
    }
  }, []);

  const verifyAndFetch = async (keyToVerify) => {
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/restaurants`, {
        headers: {
          "x-super-admin-key": keyToVerify
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data.data || []);
        setIsAuthorized(true);
        sessionStorage.setItem("super_admin_key", keyToVerify);
      } else {
        setAuthError("Incorrect super admin passkey.");
        sessionStorage.removeItem("super_admin_key");
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error("Auth verification failed:", err);
      setAuthError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!passkey.trim()) return;
    verifyAndFetch(passkey);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("super_admin_key");
    setPasskey("");
    setIsAuthorized(false);
    setRestaurants([]);
  };

  const handleUpdateSettings = async (restaurantId, updatedFields) => {
    setUpdatingId(restaurantId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/restaurants/${restaurantId}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-super-admin-key": passkey
        },
        body: JSON.stringify(updatedFields)
      });

      if (res.ok) {
        setToastMessage("Restaurant configuration updated successfully!");
        setTimeout(() => setToastMessage(""), 3000);
        // Refresh local list
        verifyAndFetch(passkey);
      } else {
        alert("Failed to update restaurant settings.");
      }
    } catch (err) {
      console.error("Failed to update restaurant:", err);
      alert("Error updating settings.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter restaurants by query
  const filteredRestaurants = restaurants.filter((r) => {
    const query = searchQuery.toLowerCase();
    const ownerName = r.users?.[0]?.name || "";
    const ownerEmail = r.users?.[0]?.loginId || "";
    return (
      r.name.toLowerCase().includes(query) ||
      ownerName.toLowerCase().includes(query) ||
      ownerEmail.toLowerCase().includes(query) ||
      r.phone.includes(query)
    );
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-sans text-white">
        <div className="w-full max-w-md bg-[#131926] border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-orange-500 via-[#ff5722] to-orange-600" />
          
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-[#ff5722] shadow-inner animate-pulse">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-4">SUPER ADMIN PORTAL</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
              Verify credentials to configure client environments
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Admin Passkey
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold tracking-wide text-white placeholder-slate-700 focus:outline-none focus:border-[#ff5722] transition duration-200"
              />
            </div>

            {authError && (
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-wide text-center">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider rounded-2xl text-[10px] transition duration-250 active:scale-95 shadow-lg shadow-orange-500/10 cursor-pointer"
            >
              {loading ? "Authenticating Authority..." : "Unlock Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      
      {/* Toast Success Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className="bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-[10px] font-black tracking-wide uppercase">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Admin Navbar */}
      <header className="bg-slate-900 text-white py-6 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-slate-900/10 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5722] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#ff5722]">RestuVexo System</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">Super Admin Dashboard</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Configure custom plans, toggle modular features, and audit trial states
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-wider transition duration-200 cursor-pointer self-start md:self-center border border-slate-750"
        >
          Close Session
        </button>
      </header>

      {/* Control Actions & Filter Bar */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-slate-150 shadow-sm text-left">
          <div className="w-full md:max-w-md relative">
            <input
              type="text"
              placeholder="Search by restaurant, owner name, or login ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff5722] focus:bg-white transition duration-250"
            />
            <span className="absolute left-3.5 top-3.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Total Registered Outlets</span>
            <span className="text-xl font-black text-slate-900 mt-1 block leading-none">{restaurants.length}</span>
          </div>
        </div>

        {/* Restaurant Admin Directory cards */}
        <div className="space-y-8">
          {filteredRestaurants.length === 0 ? (
            <div className="bg-white border border-slate-200/80 p-12 rounded-[2rem] text-center max-w-lg mx-auto">
              <p className="text-slate-400 font-semibold text-sm">No restaurants found matching search parameters.</p>
            </div>
          ) : (
            filteredRestaurants.map((res) => {
              const settingsObj = res.settings || {};
              const ownerObj = res.users?.[0] || {};
              return (
                <RestaurantCard 
                  key={res.id} 
                  restaurant={res} 
                  owner={ownerObj}
                  settings={settingsObj}
                  isUpdating={updatingId === res.id}
                  onSave={(fields) => handleUpdateSettings(res.id, fields)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Restaurant Configuration Card
function RestaurantCard({ restaurant, owner, settings, isUpdating, onSave }) {
  // Local state for editing fields
  const [customPrice, setCustomPrice] = useState(settings?.customPrice || 0);
  const [customNotes, setCustomNotes] = useState(settings?.customNotes || "");
  const [subPlan, setSubPlan] = useState(settings?.subscriptionPlan || "trial");
  const [subStatus, setSubStatus] = useState(settings?.subscriptionStatus || "active");
  const [trialEndsAt, setTrialEndsAt] = useState(settings?.trialEndsAt ? settings.trialEndsAt.substring(0, 10) : "");

  // Feature Toggles state
  const initialFeatures = settings?.enabledFeatures || {
    posBilling: true,
    qrOrdering: true,
    kds: true,
    inventory: true,
    vexoAI: true,
    whatsappAPI: true,
    staffManagement: true,
    multiBranch: true,
    analytics: true,
    thermalPrinter: true
  };
  const [features, setFeatures] = useState(initialFeatures);

  useEffect(() => {
    setCustomPrice(settings?.customPrice || 0);
    setCustomNotes(settings?.customNotes || "");
    setSubPlan(settings?.subscriptionPlan || "trial");
    setSubStatus(settings?.subscriptionStatus || "active");
    setTrialEndsAt(settings?.trialEndsAt ? settings.trialEndsAt.substring(0, 10) : "");
    setFeatures(settings?.enabledFeatures || initialFeatures);
  }, [settings]);

  const handleFeatureChange = (key, val) => {
    setFeatures(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const triggerSave = () => {
    onSave({
      subscriptionPlan: subPlan,
      subscriptionStatus: subStatus,
      trialEndsAt: subPlan === "trial" ? (trialEndsAt ? new Date(trialEndsAt).toISOString() : null) : null,
      enabledFeatures: features,
      customPrice: parseFloat(customPrice),
      customNotes: customNotes
    });
  };

  // Helper actions
  const setTrialState = (days) => {
    setSubPlan("trial");
    setSubStatus("active");
    const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setTrialEndsAt(end.toISOString().substring(0, 10));
  };

  const endTrialNow = () => {
    setSubPlan("trial");
    setSubStatus("expired");
    setTrialEndsAt(new Date().toISOString().substring(0, 10));
  };

  const setLifetimeState = () => {
    setSubPlan("lifetime");
    setSubStatus("active");
    setTrialEndsAt("");
  };

  const setCustomActiveState = () => {
    setSubPlan("custom");
    setSubStatus("active");
    setTrialEndsAt("");
  };

  const setSuspendedState = () => {
    setSubStatus("expired");
  };

  const featuresList = [
    { key: "posBilling", label: "POS Billing & Order Entry" },
    { key: "qrOrdering", label: "Customer QR Self-Ordering" },
    { key: "kds", label: "Kitchen Display (KDS)" },
    { key: "inventory", label: "Inventory Stock Control" },
    { key: "vexoAI", label: "VexoAI Chatbot Assistant" },
    { key: "whatsappAPI", label: "WhatsApp Automated Alerts" },
    { key: "staffManagement", label: "Staff & Sub-Terminals" },
    { key: "multiBranch", label: "Multi Branch Sync" },
    { key: "analytics", label: "OPEX Expenses & Reports" },
    { key: "thermalPrinter", label: "Direct Thermal Print" }
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-[2.5rem] shadow-xl p-6 md:p-8 space-y-8 hover:shadow-2xl transition duration-300 text-left">
      
      {/* Restaurant Header block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-black text-slate-900">{restaurant.name}</h3>
            <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
              subStatus === "expired" 
                ? "bg-rose-100 text-rose-700 border border-rose-200" 
                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}>
              {subStatus === "expired" ? "SUSPENDED / EXPIRED" : "ACTIVE"}
            </span>
            <span className="bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-slate-655">
              Plan: {subPlan}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-[11px] font-semibold text-slate-500">
            <p className="flex items-center gap-1.5">
              <span className="text-slate-400">Owner:</span> <strong className="text-slate-700">{owner.name || "N/A"}</strong>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="text-slate-400">Owner Login ID:</span> <strong className="text-slate-700">{owner.loginId || "N/A"}</strong>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="text-slate-400">Phone:</span> <strong className="text-slate-700">{restaurant.phone}</strong>
            </p>
            <p className="flex items-center gap-1.5 col-span-1 md:col-span-2">
              <span className="text-slate-400">Registered on:</span> <strong className="text-slate-700">{new Date(restaurant.createdAt).toLocaleDateString("en-IN")}</strong>
            </p>
          </div>
        </div>

        {/* Contract Quick Inputs */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="space-y-1 text-left">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custom Monthly Price (₹)</label>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ff5722]"
            />
          </div>
          <div className="space-y-1 text-left">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trial Expiration</label>
            <input
              type="date"
              value={trialEndsAt}
              disabled={subPlan !== "trial"}
              onChange={(e) => setTrialEndsAt(e.target.value)}
              className="w-36 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ff5722] disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Plan Operations Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Subscription Operations</h4>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setTrialState(7)}
            className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
          >
            Start 7-Day Trial
          </button>
          <button
            onClick={() => setTrialState(14)}
            className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
          >
            Extend Trial (14 days)
          </button>
          <button
            onClick={endTrialNow}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
          >
            End Trial Now
          </button>
          <button
            onClick={setLifetimeState}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
          >
            Activate Lifetime Access
          </button>
          <button
            onClick={setCustomActiveState}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer shadow-md"
          >
            Activate Custom Premium Plan
          </button>
          <button
            onClick={setSuspendedState}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
          >
            Suspend Account
          </button>
        </div>
      </div>

      {/* Custom Features Matrix */}
      <div className="space-y-3">
        <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Environment Feature Toggles</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {featuresList.map((f) => {
            const isEnabled = features[f.key] !== false;
            return (
              <div 
                key={f.key}
                onClick={() => handleFeatureChange(f.key, !isEnabled)}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer select-none transition-all duration-200 ${
                  isEnabled 
                    ? "bg-emerald-50/20 border-emerald-150 text-slate-900 hover:bg-emerald-50/30" 
                    : "bg-slate-50 border-slate-200/70 text-slate-400 hover:bg-slate-100/70"
                }`}
              >
                <span className="text-[10px] font-bold tracking-tight truncate leading-none">{f.label}</span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200 ${
                  isEnabled ? "bg-emerald-500 border-emerald-400 text-white shadow-sm" : "bg-white border-slate-200 text-transparent"
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Notes & Trigger Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
        <div className="lg:col-span-2 space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Administrative Custom Notes</label>
          <textarea
            rows={2}
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Write details of customized features, operational limits, or support notes here..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff5722] focus:bg-white transition"
          />
        </div>
        <div className="lg:col-span-1">
          <button
            onClick={triggerSave}
            disabled={isUpdating}
            className="w-full py-4.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider rounded-2xl text-[10px] transition shadow-lg shadow-orange-500/10 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing Changes...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Client Config
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
