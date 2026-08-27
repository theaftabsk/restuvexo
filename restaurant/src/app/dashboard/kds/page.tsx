"use client";

import { getBackendUrl, getSocketUrl } from "@/config/api";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  ChefHat,
  Flame,
  Check,
  Clock,
  UtensilsCrossed,
  Volume2,
  Maximize2,
  Filter,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play
} from "lucide-react";

export default function KitchenDisplaySystem() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "cooking" | "ready">("all");

  const BACKEND_URL = getBackendUrl();

  // Synthesize a crisp metallic restaurant service bell "Ding!" chime using Web Audio API
  const triggerKitchenAlerts = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Tone 1: Fundamental strike pitch
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 1350;
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);

      // Tone 2: Harmonic metallic frequency ring
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 2025;
      gain2.gain.setValueAtTime(0.1, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.8);
      osc2.stop(now + 1.4);

      if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
      }
    } catch (error) {
      console.warn("Web Audio alert prevented by browser policy:", error);
    }
  };

  const handleRealtimeNewOrder = (newOrder: any) => {
    if (!newOrder || !newOrder.id) return;

    const parsedOrder = {
      ...newOrder,
      total: parseFloat(newOrder.totalAmount?.toString() || "0"),
      discount: parseFloat(newOrder.discountApplied?.toString() || "0"),
      subtotal: parseFloat(newOrder.subtotal?.toString() || "0")
    };

    if (["pending", "cooking", "ready"].includes(parsedOrder.status)) {
      setOrders((prev) => {
        if (prev.some((o) => o.id === parsedOrder.id)) {
          return prev.map((o) => (o.id === parsedOrder.id ? parsedOrder : o));
        }
        triggerKitchenAlerts();
        return [parsedOrder, ...prev];
      });
    }
  };

  const handleRealtimeUpdate = (updatedOrder: any) => {
    if (!updatedOrder || !updatedOrder.id) {
      fetchActiveOrders(true);
      return;
    }

    const parsedOrder = {
      ...updatedOrder,
      total: parseFloat(updatedOrder.totalAmount?.toString() || "0"),
      discount: parseFloat(updatedOrder.discountApplied?.toString() || "0"),
      subtotal: parseFloat(updatedOrder.subtotal?.toString() || "0")
    };

    setOrders((prev) => {
      const isKitchenActive = ["pending", "cooking", "ready"].includes(parsedOrder.status);

      if (isKitchenActive) {
        if (prev.some((o) => o.id === parsedOrder.id)) {
          return prev.map((o) => (o.id === parsedOrder.id ? parsedOrder : o));
        } else {
          return [parsedOrder, ...prev];
        }
      } else {
        return prev.filter((o) => o.id !== parsedOrder.id);
      }
    });
  };

  useEffect(() => {
    fetchActiveOrders();

    // SOCKET.IO REAL-TIME CONNECTION
    const socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    socket.on("connect_error", () => {});

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

    // Realtime events
    socket.on("new_order_placed", handleRealtimeNewOrder);
    socket.on("order_updated", handleRealtimeUpdate);
    socket.on("order_status_updated", handleRealtimeUpdate);
    socket.on("order_deleted", (data) => {
      if (data?.id) {
        setOrders((prev) => prev.filter((o) => o.id !== data.id));
      }
    });

    // Background sync loop
    const interval = setInterval(() => {
      fetchActiveOrders(true);
    }, 60000);

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
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        const activeKitchenOrders = data.filter((order: any) =>
          ["pending", "cooking", "ready"].includes(order.status)
        );
        setOrders(activeKitchenOrders);
      }
    } catch (error) {
      console.error("KDS Failed to fetch active orders:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Update order status from KDS panel
  const handleStatusTransition = async (orderId: number, newStatus: string) => {
    const token = localStorage.getItem("authToken");

    // Optimistic UI update
    setOrders((prev) => {
      if (["pending", "cooking", "ready"].includes(newStatus)) {
        return prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      } else {
        return prev.filter((o) => o.id !== orderId);
      }
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update cooking ticket.");
      }
    } catch (error: any) {
      console.error(`Status transition error: ${error.message}`);
      fetchActiveOrders(true);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "all") return true;
    return order.status === activeFilter;
  });

  const getStatusCardStyles = (status: string) => {
    switch (status) {
      case "pending":
        return {
          border: "border-rose-300",
          badge: "bg-rose-100 text-rose-800",
          beacon: "bg-rose-600 animate-pulse"
        };
      case "cooking":
        return {
          border: "border-amber-300",
          badge: "bg-amber-100 text-amber-900",
          beacon: "bg-amber-500 animate-pulse"
        };
      case "ready":
        return {
          border: "border-emerald-300",
          badge: "bg-emerald-100 text-emerald-800",
          beacon: "bg-emerald-500"
        };
      default:
        return {
          border: "border-slate-200",
          badge: "bg-slate-100 text-slate-700",
          beacon: "bg-slate-400"
        };
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 lg:p-6 text-slate-800 font-sans">
      
      {/* KDS HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 text-[#ff5722]">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Kitchen Display System (KDS)</h1>
              <p className="text-xs text-slate-500 font-medium">Real-time KOT dispatch, live cooking timer & order queue</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={triggerKitchenAlerts}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-orange-500" />
            <span>Test Chime</span>
          </button>

          <a
            href="/kds"
            target="_blank"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Maximize2 className="w-4 h-4 text-orange-400" />
            <span>Full-Screen KDS</span>
          </a>

          <span className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Socket Live</span>
          </span>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-2 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { key: "all", label: "All Active Tickets", count: orders.length },
            { key: "pending", label: "Pending", count: orders.filter((o) => o.status === "pending").length },
            { key: "cooking", label: "Cooking", count: orders.filter((o) => o.status === "cooking").length },
            { key: "ready", label: "Ready to Serve", count: orders.filter((o) => o.status === "ready").length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeFilter === tab.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE TICKETS GRID */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold">
          Connecting to kitchen WebSocket feed...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 max-w-md mx-auto my-12 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-black text-slate-900 text-base">Kitchen is All Clear</h3>
          <p className="text-slate-400 text-xs font-medium">
            No active cooking tickets waiting in this queue. When an order is placed in POS or QR, a chime will ring automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => {
            const styles = getStatusCardStyles(order.status);
            const minutesAgo = Math.floor(
              (new Date().getTime() - new Date(order.createdAt || Date.now()).getTime()) / 60000
            );
            const isUrgent = minutesAgo >= 15 && order.status !== "ready";

            return (
              <div
                key={order.id}
                className={`bg-white border-2 ${styles.border} p-4 rounded-3xl flex flex-col justify-between shadow-2xs hover:shadow-md transition relative ${
                  isUrgent ? "ring-2 ring-rose-500" : ""
                }`}
              >
                {/* TICKET TOP HEADER */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">
                        KOT #{order.receiptNo || order.id}
                      </span>
                      <h4 className="font-black text-slate-900 text-base leading-tight mt-0.5">
                        {order.orderType === "dine_in"
                          ? `Table: ${order.table?.tableNo || "Dine-In"}`
                          : order.orderType?.toUpperCase() || "TAKEAWAY"}
                      </h4>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${styles.badge} flex items-center gap-1.5`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.beacon}`} />
                      <span>{order.status}</span>
                    </span>
                  </div>

                  {/* AGE & CREATOR */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-3">
                    <span className="truncate">Staff: {order.creator?.name || "Cashier"}</span>
                    <span
                      className={`flex items-center gap-1 shrink-0 ${
                        isUrgent ? "text-rose-600 font-black" : "text-slate-600"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{minutesAgo}m ago</span>
                    </span>
                  </div>

                  {/* ITEMS LIST */}
                  <div className="space-y-2.5 my-2">
                    {(order.orderItems || []).map((it: any, idx: number) => {
                      const itemName = it.nameSnapshot || it.name || it.menuItem?.name || "Dish Item";
                      const variantName = it.variantSnapshot || it.variantName || it.variation;
                      return (
                        <div key={idx} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-black text-slate-900 block">{itemName}</span>
                              {variantName && (
                                <span className="text-[10px] font-bold text-orange-600 block">
                                  Portion: {variantName}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                              x{it.qty}
                            </span>
                          </div>

                          {/* SPICE & NOTES */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {it.spiceLevel && it.spiceLevel !== "Normal" && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-900 flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5 text-orange-600" />
                                <span>{it.spiceLevel}</span>
                              </span>
                            )}
                            {it.notes && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-800">
                                Note: {it.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-3 border-t border-slate-100 mt-2">
                  {order.status === "pending" && (
                    <button
                      onClick={() => handleStatusTransition(order.id, "cooking")}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {order.status === "cooking" && (
                    <button
                      onClick={() => handleStatusTransition(order.id, "ready")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark Ready to Serve</span>
                    </button>
                  )}

                  {order.status === "ready" && (
                    <button
                      onClick={() => handleStatusTransition(order.id, "completed")}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Serve / Complete</span>
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
