"use client";

import { getBackendUrl, getSocketUrl } from "@/config/api";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

export default function StandaloneKitchenDisplaySystem() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // all, pending, cooking, ready
  const [user, setUser] = useState<any>(null);

  // Premium Always-On Screen & Live Connection Control States
  const [gridColumns, setGridColumns] = useState(4); // Grid layout density selector: 2, 3, 4, 5
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const BACKEND_URL = getBackendUrl();
  const socketRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  // Screen Wake Lock API: Prevent monitor from going to sleep or dimming
  const requestWakeLock = async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      setWakeLockActive(true);
      console.log("Screen Wake Lock activated successfully");
    } catch (err: any) {
      console.warn("Screen Wake Lock failed to activate:", err.message);
      setWakeLockActive(false);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        console.log("Screen Wake Lock released");
      } catch (err) {
        console.error("Failed to release Wake Lock:", err);
      }
    }
  };

  useEffect(() => {
    // Secure Standalone Auth Verification Barrier
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      window.location.href = "/auth/login";
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    fetchActiveOrders();
    requestWakeLock(); // Lock screen on mount for 24/7 kitchen monitor availability

    // Connect Live Socket Client for absolute zero server load
    const socket = io(getSocketUrl(), {
      transports: ["polling"],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Kitchen KDS Socket Connected:", socket.id);
      setSocketConnected(true);
      setLastUpdated(new Date());
      if (parsedUser.restaurantId) {
        socket.emit("join_restaurant", parsedUser.restaurantId);
      }
    });

    socket.on("disconnect", () => {
      console.log("Kitchen KDS Socket Disconnected");
      setSocketConnected(false);
    });

    socket.on("connect_error", () => {
      setSocketConnected(false);
    });

    socket.on("new_order_placed", (order) => {
      const isValid = ["pending", "cooking", "ready"].includes(order.status);
      if (!isValid) return;

      setOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        
        // Sound bronze metallic bell on brand new ticket placement
        triggerKitchenAlerts();
        setLastUpdated(new Date());
        return [order, ...prev];
      });
    });

    socket.on("order_updated", (order) => {
      setOrders(prev => {
        const isValid = ["pending", "cooking", "ready"].includes(order.status);
        if (!isValid) {
          return prev.filter(o => o.id !== order.id);
        }
        setLastUpdated(new Date());
        return prev.map(o => o.id === order.id ? order : o);
      });
    });

    socket.on("order_status_updated", (order) => {
      setOrders(prev => {
        const isValid = ["pending", "cooking", "ready"].includes(order.status);
        if (!isValid) {
          return prev.filter(o => o.id !== order.id);
        }
        setLastUpdated(new Date());
        return prev.map(o => o.id === order.id ? order : o);
      });
    });

    socket.on("order_deleted", (payload) => {
      setOrders(prev => prev.filter(o => o.id !== payload.id));
      setLastUpdated(new Date());
    });

    // Fallback Silent Polling every 3 minutes to keep server load extremely low
    const pollingInterval = setInterval(() => {
      fetchActiveOrders(true);
    }, 180000);

    // Re-request wake lock when user switches back to active tab
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (socket) socket.disconnect();
      clearInterval(pollingInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, []);

  const fetchActiveOrders = async (isSilent = false) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    
    try {
      const params = new URLSearchParams({
        status: "pending,cooking,ready",
        dateFilter: "all",
        limit: "150"
      });
      const res = await fetch(`${BACKEND_URL}/api/orders?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        
        const activeKitchenOrders = data.filter((order: any) => 
          ["pending", "cooking", "ready"].includes(order.status)
        );

        setOrders(activeKitchenOrders);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("KDS Failed to poll orders:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Synthesize a beautiful, premium metallic restaurant service bell "Ding!" sound using Web Audio API
  const triggerKitchenAlerts = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      // Tone 1: Fundamental strike pitch
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 1350; 
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.6); 
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      // Tone 2: Harmonic metallic frequency ring
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 2025; 
      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      // Tone 3: Subtle metal body vibrato
      const osc3 = audioCtx.createOscillator();
      const gain3 = audioCtx.createGain();
      osc3.type = "triangle";
      osc3.frequency.value = 1680; 
      gain3.gain.setValueAtTime(0.04, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc3.connect(gain3);
      gain3.connect(audioCtx.destination);

      // Start oscillators simultaneously
      osc1.start(now);
      osc2.start(now);
      osc3.start(now);

      // Stop after decay cycles
      osc1.stop(now + 1.8);
      osc2.stop(now + 1.4);
      osc3.stop(now + 1.0);

      // Trigger Physical Haptic Device Vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
      }

    } catch (error) {
      console.warn("Web Audio alert was prevented by browser interaction rules.", error);
    }
  };

  // Update order status with instant, responsive client-side optimistic merging
  const handleStatusTransition = async (orderId: any, newStatus: string) => {
    const token = localStorage.getItem("authToken");

    // Optimistic Client Update for instantaneous user feedback
    const originalOrders = [...orders];
    setOrders(prev => {
      if (newStatus === "completed") {
        return prev.filter(o => o.id !== orderId);
      }
      return prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update cooking ticket.");
      }

      setLastUpdated(new Date());

    } catch (error: any) {
      // Revert optimistic updates if server reports failure
      setOrders(originalOrders);
      alert(`Status Error: ${error.message}`);
    }
  };

  // Filter KDS tickets based on selected button pill
  const filteredOrders = orders.filter(order => {
    if (activeFilter === "all") return true;
    return order.status === activeFilter;
  });

  const getGridColsClass = () => {
    switch (gridColumns) {
      case 2: return "grid sm:grid-cols-2 gap-6 text-left";
      case 3: return "grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left";
      case 4: return "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left";
      case 5: return "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 text-left";
      default: return "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left";
    }
  };

  const getStatusCardStyles = (status: string) => {
    switch (status) {
      case "pending":
        return {
          border: "border-rose-200",
          bg: "bg-white",
          text: "text-rose-600",
          badge: "bg-rose-50 border border-rose-100 text-rose-600",
          beacon: "bg-rose-500 animate-pulse"
        };
      case "cooking":
        return {
          border: "border-amber-200",
          bg: "bg-white",
          text: "text-amber-600",
          badge: "bg-amber-50 border border-amber-100 text-amber-600",
          beacon: "bg-amber-500 animate-pulse"
        };
      case "ready":
        return {
          border: "border-emerald-200",
          bg: "bg-white",
          text: "text-emerald-600",
          badge: "bg-emerald-50 border border-emerald-100 text-emerald-600",
          beacon: "bg-emerald-500 animate-pulse"
        };
      default:
        return {
          border: "border-slate-200",
          bg: "bg-white",
          text: "text-slate-600",
          badge: "bg-slate-50 border border-slate-100 text-slate-600",
          beacon: "bg-slate-400"
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-semibold">Tethering kitchen order feeds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-6 text-slate-800 pb-20 font-sans">
      
      {/* KDS Header Controls */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 p-6 text-white border border-slate-800 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        
        <div className="text-left space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded">Kitchen Display Terminal</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 px-2 py-0.5 rounded flex items-center gap-1">
              Last Sync: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          <h1 className="text-xl font-black tracking-tight pt-1">
            Chef Dashboard: {user?.name || "Kitchen Master"}
          </h1>
          <p className="text-slate-400 text-[10px] font-semibold">
            Manage live cooking tickets, update KOT preparation levels, and sound metallic service bells
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={triggerKitchenAlerts}
            className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-[10px] uppercase tracking-widest rounded-xl border border-slate-700 transition flex items-center gap-2 shadow-xl"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            Service Bell
          </button>
          
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/auth/login";
            }}
            className="px-4.5 py-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl border border-rose-500/25 transition duration-300 flex items-center gap-2 shadow-xl"
          >
            <svg className="w-3.5 h-3.5 text-rose-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* KDS Control Toolbar: Filters, Grid Density & Live Connection Status */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white border border-slate-200 p-4.5 rounded-[2rem] shadow-sm text-left">
        
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none justify-start">
          {[
            { key: "all", label: "All Tickets", count: orders.length },
            { key: "pending", label: "Pending", count: orders.filter(o => o.status === "pending").length },
            { key: "cooking", label: "Cooking", count: orders.filter(o => o.status === "cooking").length },
            { key: "ready", label: "Ready", count: orders.filter(o => o.status === "ready").length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition duration-200 ${
                activeFilter === tab.key 
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500 font-extrabold"
              }`}
            >
              {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Layout Density Controls & Sync Status */}
        <div className="flex flex-wrap items-center gap-4.5 justify-between lg:justify-end">
          
          {/* Grid columns configuration */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Monitor Grid:</span>
            <div className="bg-slate-100 border border-slate-200/60 p-1 rounded-xl flex items-center gap-1">
              {[
                { col: 2, label: "2 Col" },
                { col: 3, label: "3 Col" },
                { col: 4, label: "4 Col" },
                { col: 5, label: "5 Col" }
              ].map((cfg) => (
                <button
                  key={cfg.col}
                  onClick={() => setGridColumns(cfg.col)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                    gridColumns === cfg.col
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wake Lock & Sync badges */}
          <div className="flex items-center gap-3">
            
            {/* Wake Lock Status Badge */}
            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${
              wakeLockActive 
                ? "bg-indigo-50 border-indigo-150 text-indigo-700" 
                : "bg-slate-50 border-slate-200 text-slate-450"
            }`} title="Keeps your screen turned on all day without sleeping.">
              <span className={`w-1.5 h-1.5 rounded-full ${wakeLockActive ? "bg-indigo-600 animate-pulse" : "bg-slate-400"}`} />
              Screen Lock: {wakeLockActive ? "Active" : "Off"}
            </span>

            {/* Socket Live Sync Badge */}
            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${
              socketConnected 
                ? "bg-emerald-50 border-emerald-150 text-emerald-700" 
                : "bg-amber-50 border-amber-150 text-amber-700 animate-pulse"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? "bg-emerald-600 animate-ping" : "bg-amber-500"}`} />
              {socketConnected ? "Live Connected" : "Sync Dropped (Reconnecting...)"}
            </span>

            {/* Force Refresh Manual button */}
            <button
              onClick={() => {
                fetchActiveOrders(false);
                setLastUpdated(new Date());
                requestWakeLock();
              }}
              title="Force manual refresh & wake-lock check"
              className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-95 transition rounded-xl text-slate-500 hover:text-slate-800"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
              </svg>
            </button>

          </div>

        </div>

      </div>

      {/* KDS Active Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 p-16 text-center rounded-[2.5rem] max-w-xl mx-auto space-y-4 mt-6">
          <div className="w-16 h-16 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-base leading-none">Kitchen is Clear</h3>
            <p className="text-slate-400 text-[10px] font-semibold leading-relaxed pt-1.5 max-w-sm mx-auto">
              There are no active orders waiting in this status queue. When a new ticket is checked out, a beep alert will sound automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className={getGridColsClass()}>
          {filteredOrders.map((order) => {
            const styles = getStatusCardStyles(order.status);
            const minutesAgo = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
            const isUrgent = minutesAgo >= 15 && order.status !== "ready";

            return (
              <div
                key={order.id}
                className={`bg-white border p-6 rounded-[2.2rem] flex flex-col justify-between gap-5 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${styles.border} ${
                  isUrgent ? "ring-2 ring-rose-500 animate-pulse bg-rose-50/10" : ""
                }`}
              >
                
                {/* Ticket Top bar */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#RESTUVEXO-{order.id}</span>
                      <h4 className="font-black text-slate-900 text-sm mt-0.5 leading-none">
                        {order.orderType === "dine_in" 
                          ? `${order.table?.tableNo || "Dine-In"}` 
                          : order.orderType.toUpperCase()}
                      </h4>
                    </div>
                    
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${styles.badge} flex items-center gap-1.5`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.beacon}`} />
                      {order.status}
                    </span>
                  </div>

                  {/* KOT Age Indicator */}
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <span>Captain: {order.creator?.name || "Self"}</span>
                    <span className={`flex items-center gap-1 ${isUrgent ? "text-rose-600 font-black animate-pulse" : "font-semibold"}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {minutesAgo}m ago
                    </span>
                  </div>

                  {/* Food Items Ordered - max-h limits height, internal scrolling prevents card distortion */}
                  <ul className="space-y-2.5 pt-1 text-slate-700 font-bold text-xs max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {order.orderItems?.map((item: any, idx: number) => (
                      <li key={idx} className="flex flex-col gap-1 bg-slate-50/50 p-3 border border-slate-100 rounded-2xl">
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-slate-800 font-extrabold">• {item.menuItem?.name}</span>
                          <span className={`font-black text-sm shrink-0 ${order.status === "pending" ? "text-rose-600" : "text-slate-950"}`}>
                            x{item.qty}
                          </span>
                        </div>
                        {item.note && (
                          <div className="text-[9px] text-rose-600 font-black uppercase tracking-wide bg-rose-50/50 border border-rose-100 rounded-lg px-2.5 py-1.5 ml-2 mt-1 flex items-start gap-1.5 text-left">
                            <svg className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Note: {item.note}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                </div>

                {/* State Transition buttons */}
                <div className="border-t border-slate-100 pt-3.5 flex gap-2">
                  {order.status === "pending" && (
                    <button
                      onClick={() => handleStatusTransition(order.id, "cooking")}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Start Cooking
                    </button>
                  )}
                  {order.status === "cooking" && (
                    <button
                      onClick={() => handleStatusTransition(order.id, "ready")}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Mark Ready
                    </button>
                  )}
                  {order.status === "ready" && (
                    <button
                      onClick={() => handleStatusTransition(order.id, "completed")}
                      className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Complete &amp; Serve
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
