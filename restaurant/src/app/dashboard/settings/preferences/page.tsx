"use client";

import { getBackendUrl, getSocketUrl } from "@/config/api";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { 
  SlidersHorizontal, 
  Sparkles, 
  Zap, 
  Volume2, 
  Smartphone, 
  Bot, 
  Store, 
  LayoutGrid, 
  Wifi, 
  CheckCircle2,
  ShieldCheck,
  Check
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

export default function PreferencesSettings() {
  const [enableQrOrdering, setEnableQrOrdering] = useState(true);
  const [sidebarQuickActions, setSidebarQuickActions] = useState(true);
  const [sidebarStoreSwitch, setSidebarStoreSwitch] = useState(true);
  const [enableVexoAi, setEnableVexoAi] = useState(true);
  const [vexoAiNormalLimit, setVexoAiNormalLimit] = useState(15);
  const [vexoAiApiLimit, setVexoAiApiLimit] = useState(5);
  const [enabledFeatures, setEnabledFeatures] = useState<any>({});
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const BACKEND_URL = getBackendUrl();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let restaurantId: number | null = null;
    const storedUser = localStorage.getItem("user");
    const storedRest = localStorage.getItem("restaurant");

    if (storedRest) {
      try {
        const parsed = JSON.parse(storedRest);
        restaurantId = parsed.id;
      } catch (e) {}
    }
    if (!restaurantId && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        restaurantId = parsed.restaurantId;
      } catch (e) {}
    }

    // 1. Initial REST Fetch
    const fetchSettings = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          applySettings(data);
        }
      } catch (e) {
        console.error("Failed to load settings from server:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    // 2. Real-Time WebSocket Connection
    if (restaurantId) {
      const socket = io(getSocketUrl(), {
        transports: ["polling"],
      upgrade: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setIsWsConnected(true);
        socket.emit("join_restaurant", restaurantId);
      });

      socket.on("disconnect", () => {
        setIsWsConnected(false);
      });

      socket.on("settings_updated", (newSettings) => {
        applySettings(newSettings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      });

      socket.on("table_updated", () => {
        fetchSettings();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, []);

  const applySettings = (data: any) => {
    if (!data) return;
    const features = data.enabledFeatures || {};
    setEnabledFeatures(features);
    setEnableQrOrdering(features.qrOrdering === false ? false : (data.qrOrderingEnabled !== false));
    setSidebarQuickActions(data.sidebarQuickActions !== false);
    setSidebarStoreSwitch(data.sidebarStoreSwitch !== false);
    setEnableVexoAi(features.vexoAI === false ? false : (data.vexoAiEnabled !== false));
    setVexoAiNormalLimit(data.vexoAiNormalLimit !== undefined ? data.vexoAiNormalLimit : 15);
    setVexoAiApiLimit(data.vexoAiApiLimit !== undefined ? data.vexoAiApiLimit : 5);
  };

  const saveSetting = async (key: string, val: any) => {
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
        setTimeout(() => setIsSaved(false), 2000);
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

  const isQrOrderingLocked = enabledFeatures?.qrOrdering === false;
  const isVexoAiLocked = enabledFeatures?.vexoAI === false;

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-16">
      
      {/* Dynamic Saved Toast */}
      {isSaved && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className="bg-emerald-500/10 border border-emerald-500/25 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-emerald-600 backdrop-blur-xl">
            <Check className="w-4 h-4 text-emerald-500" />
            <p className="text-[11px] font-black tracking-wide uppercase">Preferences updated real-time!</p>
          </div>
        </div>
      )}

      {/* Header & WebSocket Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Preferences</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure terminal parameters and ordering constraints</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
            isWsConnected 
              ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isWsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span>{isWsConnected ? "⚡ WebSocket Live Synced" : "Connecting Live Feed..."}</span>
          </span>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-6">
          
          {/* Header Indicator */}
          <div className="flex items-center justify-between border-b border-slate-50 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-150 flex items-center justify-center text-[#ff5722]">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-900">POS & Customer Controls</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Real-time terminal rule settings</p>
              </div>
            </div>
          </div>

          {/* Preference Config Row 1: Customer QR Self-Ordering Toggle */}
          <div className="flex items-center justify-between gap-6 p-4 rounded-2xl hover:bg-slate-50/80 transition duration-300">
            <div className="space-y-1.5 max-w-md text-left">
              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-700" />
                Customer QR Self-Ordering Portal
                {isQrOrderingLocked && (
                  <span className="bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase shrink-0">LOCKED</span>
                )}
              </p>
              <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
                When ENABLED, visitors scanning their table QR code can place in-store food orders directly from their phones. If DISABLED, it acts as a View-Only digital menu.
              </p>
            </div>
            
            <button
              type="button"
              onClick={isQrOrderingLocked ? undefined : handleToggleQrOrdering}
              disabled={isQrOrderingLocked}
              className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-350 focus:outline-none shrink-0 cursor-pointer ${
                isQrOrderingLocked ? "bg-slate-100 border border-slate-200 cursor-not-allowed" : (enableQrOrdering ? "bg-[#ff5722]" : "bg-slate-200")
              }`}
            >
              <span className={`inline-block h-5.5 w-5.5 transform rounded-full bg-white transition-transform duration-300 ${
                isQrOrderingLocked ? "translate-x-1" : (enableQrOrdering ? "translate-x-6.5" : "translate-x-1")
              }`} />
            </button>
          </div>

          {/* Preference Config Row 3: Sidebar Store Status switch toggle visibility */}
          <div className="flex items-center justify-between gap-6 p-4 rounded-2xl hover:bg-slate-50/80 transition duration-300 border-t border-slate-100/60 pt-5 mt-2">
            <div className="space-y-1.5 max-w-md text-left">
              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-700" />
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
              className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 cursor-pointer ${sidebarStoreSwitch ? "bg-[#ff5722]" : "bg-slate-200"}`}
            >
              <span className={`inline-block h-5.5 w-5.5 transform rounded-full bg-white transition-transform duration-300 ${sidebarStoreSwitch ? "translate-x-6.5" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Preference Config Row 4: Sidebar Quick Actions Panel visibility */}
          <div className="flex items-center justify-between gap-6 p-4 rounded-2xl hover:bg-slate-50/80 transition duration-300 border-t border-slate-100/60 pt-5 mt-2">
            <div className="space-y-1.5 max-w-md text-left">
              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-slate-700" />
                Show Quick Actions Panel on Sidebar
              </p>
              <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
                When ENABLED, the black "Quick Action" dropdown button is rendered under the owner workspace header. If DISABLED, this button is hidden.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const next = !sidebarQuickActions;
                setSidebarQuickActions(next);
                saveSetting("sidebarQuickActions", next);
              }}
              className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 cursor-pointer ${sidebarQuickActions ? "bg-[#ff5722]" : "bg-slate-200"}`}
            >
              <span className={`inline-block h-5.5 w-5.5 transform rounded-full bg-white transition-transform duration-300 ${sidebarQuickActions ? "translate-x-6.5" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Preference Config Row 5: VexoAI Chatbot Toggle */}
          <div className="flex items-center justify-between gap-6 p-4 rounded-2xl hover:bg-slate-50/80 transition duration-300 border-t border-slate-100/60 pt-5 mt-2">
            <div className="space-y-1.5 max-w-md text-left">
              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-700" />
                Enable VexoAI Chatbot Assistant
                {isVexoAiLocked && (
                  <span className="bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase shrink-0">LOCKED</span>
                )}
              </p>
              <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
                When ENABLED, the VexoAI smart floating helper widget is displayed on the main admin dashboard. If DISABLED, the AI assistant widget is hidden.
              </p>
            </div>
            
            <button
              type="button"
              onClick={isVexoAiLocked ? undefined : () => {
                const next = !enableVexoAi;
                setEnableVexoAi(next);
                saveSetting("vexoAiEnabled", next);
              }}
              disabled={isVexoAiLocked}
              className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 cursor-pointer ${
                isVexoAiLocked ? "bg-slate-100 border border-slate-200 cursor-not-allowed" : (enableVexoAi ? "bg-[#ff5722]" : "bg-slate-200")
              }`}
            >
              <span className={`inline-block h-5.5 w-5.5 transform rounded-full bg-white transition-transform duration-300 ${
                isVexoAiLocked ? "translate-x-1" : (enableVexoAi ? "translate-x-6.5" : "translate-x-1")
              }`} />
            </button>
          </div>

          {/* Preference Config Row 6: VexoAI Message Daily Limits */}
          {enableVexoAi && !isVexoAiLocked && (
            <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-4 text-left mt-2">
              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                VexoAI Daily Rate Limits
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Normal Queries Limit (per Day)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={vexoAiNormalLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 15;
                      setVexoAiNormalLimit(val);
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10) || 15;
                      saveSetting("vexoAiNormalLimit", val);
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#ff5722] focus:outline-none rounded-xl text-xs font-bold text-slate-800"
                  />
                  <span className="text-[9px] text-slate-400 font-medium">Standard status, POS, KDS navigation guides.</span>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Advanced API Queries Limit (per Day)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={vexoAiApiLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 5;
                      setVexoAiApiLimit(val);
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10) || 5;
                      saveSetting("vexoAiApiLimit", val);
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#ff5722] focus:outline-none rounded-xl text-xs font-bold text-slate-800"
                  />
                  <span className="text-[9px] text-slate-400 font-medium">Queries requiring active LLM API execution.</span>
                </div>
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex items-start gap-3.5 text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Zap className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Interactive Synced State</h4>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Any changes made to these rules will immediately propagate live to the active [POS Billing Terminal] and [QR Table Orders] across all devices without requiring manual page reloads.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
