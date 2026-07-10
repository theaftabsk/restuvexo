"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";

export default function KitchenDisplaySystem() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // all, pending, cooking, ready

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  // Synthesize a beautiful, premium metallic restaurant service bell "Ding!" sound using Web Audio API
  const triggerKitchenAlerts = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      // Tone 1: Fundamental strike pitch
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 1350; // Crisp high pitch bell chime
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.6); // Long decay ring!
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      // Tone 2: Harmonic metallic frequency ring
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 2025; // Perfect 1.5x harmonic
      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      // Tone 3: Subtle metal body vibrato (gives real bronze bell warmth)
      const osc3 = audioCtx.createOscillator();
      const gain3 = audioCtx.createGain();
      osc3.type = "triangle";
      osc3.frequency.value = 1680; // Over-tone
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

      // Trigger Physical Haptic Device Vibration (if tablet/mobile supported)
      if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
      }

      console.log("Premium metal service bell chime and haptic vibration triggered successfully!");

    } catch (error) {
      console.warn("Web Audio alert was prevented by browser interaction rules.", error);
    }
  };

  const handleRealtimeNewOrder = (newOrder) => {
    if (!newOrder || !newOrder.id) return;
    
    const parsedOrder = {
      ...newOrder,
      total: parseFloat(newOrder.totalAmount?.toString() || "0"),
      discount: parseFloat(newOrder.discountApplied?.toString() || "0"),
      subtotal: parseFloat(newOrder.subtotal?.toString() || "0")
    };

    if (["pending", "cooking", "ready"].includes(parsedOrder.status)) {
      setOrders(prev => {
        if (prev.some(o => o.id === parsedOrder.id)) {
          return prev.map(o => o.id === parsedOrder.id ? parsedOrder : o);
        }
        if (parsedOrder.status === "pending") {
          triggerKitchenAlerts();
        }
        return [parsedOrder, ...prev];
      });
    }
  };

  const handleRealtimeUpdate = (updatedOrder) => {
    if (!updatedOrder || !updatedOrder.id) return;

    const parsedOrder = {
      ...updatedOrder,
      total: parseFloat(updatedOrder.totalAmount?.toString() || "0"),
      discount: parseFloat(updatedOrder.discountApplied?.toString() || "0"),
      subtotal: parseFloat(updatedOrder.subtotal?.toString() || "0")
    };

    setOrders(prev => {
      const isKitchenActive = ["pending", "cooking", "ready"].includes(parsedOrder.status);

      if (isKitchenActive) {
        if (prev.some(o => o.id === parsedOrder.id)) {
          const oldOrder = prev.find(o => o.id === parsedOrder.id);
          if (parsedOrder.status === "pending" && oldOrder.status !== "pending") {
            triggerKitchenAlerts();
          }
          return prev.map(o => o.id === parsedOrder.id ? parsedOrder : o);
        } else {
          if (parsedOrder.status === "pending") {
            triggerKitchenAlerts();
          }
          return [parsedOrder, ...prev];
        }
      } else {
        return prev.filter(o => o.id !== parsedOrder.id);
      }
    });
  };

  const handleRealtimeDelete = (deletedData) => {
    if (deletedData && deletedData.id) {
      setOrders(prev => prev.filter(o => o.id !== deletedData.id));
    }
  };

  useEffect(() => {
    fetchActiveOrders();

    // SOCKET.IO REAL-TIME CONNECTION
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("KDS Socket Connected:", socket.id);
      const userStr = localStorage.getItem("user");
      const restStr = localStorage.getItem("restaurant");
      try {
        let restaurantId = null;
        if (userStr) restaurantId = JSON.parse(userStr).restaurantId;
        if (!restaurantId && restStr) restaurantId = JSON.parse(restStr).id;

        if (restaurantId) {
          socket.emit("join_restaurant", restaurantId);
        }
      } catch (e) {}
    });

    // Listen for instant order updates directly inside client memory!
    socket.on("new_order_placed", handleRealtimeNewOrder);
    socket.on("order_updated", handleRealtimeUpdate);
    socket.on("order_status_updated", handleRealtimeUpdate);
    socket.on("order_deleted", handleRealtimeDelete);

    // Fail-safe backup polling loop: run every 3 minutes
    const interval = setInterval(() => {
      fetchActiveOrders(true); 
    }, 180000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchActiveOrders = async (isSilent = false) => {
    const token = localStorage.getItem("authToken");
    try {
      const params = new URLSearchParams({
        status: "pending,cooking,ready",
        dateFilter: "all",
        limit: "100"
      });
      const res = await fetch(`${BACKEND_URL}/api/orders?${params}&_=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];

        const activeKitchenOrders = data.filter(order =>
          ["pending", "cooking", "ready"].includes(order.status)
        );

        setOrders(activeKitchenOrders);
      }
    } catch (error) {
      console.error("KDS Failed to poll active orders:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Update order status from KDS panel
  const handleStatusTransition = async (orderId, newStatus) => {
    const token = localStorage.getItem("authToken");

    // Optimistically update status in local state for instantaneous user response & zero DB hit!
    setOrders(prev => {
      if (["pending", "cooking", "ready"].includes(newStatus)) {
        return prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
      } else {
        return prev.filter(o => o.id !== orderId);
      }
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

    } catch (error) {
      console.error(`Status transition error: ${error.message}`);
      fetchActiveOrders(true);
    }
  };

  // Filter KDS tickets based on selected button pill
  const filteredOrders = orders.filter(order => {
    if (activeFilter === "all") return true;
    return order.status === activeFilter;
  });

  const getStatusCardStyles = (status) => {
    switch (status) {
      case "pending":
        return {
          border: "border-rose-250",
          bg: "bg-white",
          text: "text-rose-600",
          badge: "bg-rose-50 border border-rose-100 text-rose-600",
          beacon: "bg-rose-500 animate-pulse"
        };
      case "cooking":
        return {
          border: "border-amber-250",
          bg: "bg-white",
          text: "text-amber-600",
          badge: "bg-amber-50 border border-amber-100 text-amber-600",
          beacon: "bg-amber-500 animate-pulse"
        };
      case "ready":
        return {
          border: "border-emerald-250",
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
    return <LoadingScreen message="Tethering kitchen order feeds..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 text-slate-800 animate-fade-in font-sans">
      
      {/* KDS Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-100 pb-6 text-left">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Kitchen Display Board
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            Live cooking queues. Initialize your audio engine and monitor ticket updates in real time
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
          <a
            href="/kds"
            target="_blank"
            className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Full Screen KDS
          </a>
          
          <button
            onClick={triggerKitchenAlerts}
            className="px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold rounded-xl text-[10px] uppercase tracking-wider shadow-sm transition flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            Test Alert Beep
          </button>
          
          <span className="px-3.5 py-2.5 bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600 rounded-xl flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
            Live Monitor
          </span>
        </div>
      </div>

      {/* Ticket Filtering Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none justify-start">
        {[
          { key: "all", label: "All Tickets", count: orders.length },
          { key: "pending", label: "Pending", count: orders.filter(o => o.status === "pending").length },
          { key: "cooking", label: "Cooking", count: orders.filter(o => o.status === "cooking").length },
          { key: "ready", label: "Ready", count: orders.filter(o => o.status === "ready").length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition duration-200 ${
              activeFilter === tab.key 
                ? "bg-slate-900 border-slate-900 text-white shadow-md" 
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
            }`}
          >
            {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* KDS Active Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-slate-50 p-16 text-center rounded-[2.5rem] border border-slate-200 max-w-xl mx-auto mt-6 space-y-4">
          <div className="w-16 h-16 bg-white border border-slate-150 rounded-2xl flex items-center justify-center mx-auto text-slate-550">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
          {filteredOrders.map((order) => {
            const styles = getStatusCardStyles(order.status);
            const minutesAgo = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
            const isUrgent = minutesAgo >= 15 && order.status !== "ready";

            return (
              <div
                key={order.id}
                className={`bg-white border border-slate-200 p-6 rounded-[2.2rem] flex flex-col justify-between gap-5 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${
                  isUrgent ? "ring-2 ring-rose-500 animate-pulse" : ""
                }`}
              >
                
                {/* Ticket Top bar */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#RESTUVEXO-{order.id}</span>
                      <h4 className="font-black text-slate-900 text-base leading-tight mt-0.5">
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

                  {/* Food Items Ordered */}
                  <ul className="space-y-3.5 pt-2 text-slate-700 font-bold text-xs">
                    {order.orderItems.map((item, idx) => (
                      <li key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-slate-800 font-extrabold">• {item.menuItem?.name}</span>
                          <span className={`font-black text-sm shrink-0 ${order.status === "pending" ? "text-rose-600" : "text-slate-900"}`}>
                            x{item.qty}
                          </span>
                        </div>
                        {item.note && (
                          <div className="text-[9px] text-rose-600 font-black uppercase tracking-wide bg-rose-50/50 border border-rose-100 rounded-lg px-2.5 py-1.5 ml-2 mt-1 flex items-start gap-1.5">
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
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 rounded-xl text-[10px] uppercase tracking-widest transition shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5"
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
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3 rounded-xl text-[10px] uppercase tracking-widest transition shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
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
                      className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-3 rounded-xl text-[10px] uppercase tracking-widest transition shadow-md flex items-center justify-center gap-1.5"
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
