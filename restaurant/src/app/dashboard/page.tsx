"use client";

import { getBackendUrl, getSocketUrl } from "@/config/api";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Plus,
  ChefHat,
  LayoutGrid,
  TrendingUp,
  ShoppingBag,
  Flame,
  IndianRupee,
  Eye,
  Receipt,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  ArrowUpRight,
  Printer,
  X
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);

  // Core metrics & operational states
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "completed">("all");

  // Receipt Modal State
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const BACKEND_URL = getBackendUrl();
  const fetchTimeoutRef = useRef<any>(null);

  // Time-based Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Today formatted string
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }, []);

  // Fetch Dashboard Stats & Recent Orders in parallel
  const fetchDashboardData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/dashboard/stats?_=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        }),
        fetch(`${BACKEND_URL}/api/orders?limit=10&_=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders(Array.isArray(ordersData) ? ordersData : ordersData.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const debouncedRefresh = () => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchDashboardData();
    }, 250);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRestaurant = localStorage.getItem("restaurant");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedRestaurant) setRestaurant(JSON.parse(storedRestaurant));

    fetchDashboardData();

    // Setup Live WebSocket Sync
    const socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    socket.on("connect_error", () => {});

    socket.on("connect", () => {
      let restId = null;
      if (storedUser) restId = JSON.parse(storedUser).restaurantId;
      if (!restId && storedRestaurant) restId = JSON.parse(storedRestaurant).id;
      if (restId) {
        socket.emit("join_restaurant", restId);
      }
    });

    socket.on("new_order_placed", () => debouncedRefresh());
    socket.on("new_qr_order_placed", () => debouncedRefresh());
    socket.on("order_status_updated", () => debouncedRefresh());
    socket.on("order_deleted", () => debouncedRefresh());
    socket.on("table_updated", () => debouncedRefresh());

    return () => {
      socket.disconnect();
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    if (orderFilter === "active") {
      return recentOrders.filter(
        (o) => o.status === "pending" || o.status === "cooking" || o.status === "ready"
      );
    }
    if (orderFilter === "completed") {
      return recentOrders.filter(
        (o) => o.status === "completed" || o.paymentStatus === "paid"
      );
    }
    return recentOrders;
  }, [recentOrders, orderFilter]);

  // Mini 7-Day Chart Setup
  const chartData = useMemo(() => {
    if (!stats?.last7Days || stats.last7Days.length === 0) {
      return {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            data: [0, 0, 0, 0, 0, 0, stats?.todayRevenue || 0],
            fill: true,
            borderColor: "#ff5722",
            backgroundColor: "rgba(255, 87, 34, 0.08)",
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#ff5722",
            borderWidth: 2.5
          }
        ]
      };
    }

    const labels = stats.last7Days.map((d: any) => d.date);
    const revenues = stats.last7Days.map((d: any) => d.revenue);

    return {
      labels,
      datasets: [
        {
          data: revenues,
          fill: true,
          borderColor: "#ff5722",
          backgroundColor: "rgba(255, 87, 34, 0.08)",
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#ff5722",
          borderWidth: 2.5
        }
      ]
    };
  }, [stats]);

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        titleFont: { size: 11, weight: "bold" },
        bodyFont: { size: 12, weight: "bold" },
        padding: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => `₹${Number(context.raw || 0).toLocaleString("en-IN")}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: "600" }, color: "#94a3b8" }
      },
      y: {
        display: false,
        beginAtZero: true
      }
    }
  };

  // Helper for Order Status Pills
  const renderStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === "paid" || status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <CheckCircle2 className="w-3 h-3" /> Paid
        </span>
      );
    }
    if (status === "ready") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
          <CheckCircle2 className="w-3 h-3" /> Ready
        </span>
      );
    }
    if (status === "cooking") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 animate-pulse">
          <ChefHat className="w-3 h-3 text-amber-600" /> Cooking
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3 h-3 text-slate-500" /> Pending
      </span>
    );
  };

  // Elapsed time helper
  const getElapsedTime = (dateStr: string) => {
    if (!dateStr) return "";
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    return `${diffMins}m`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. TOP HEADER & FAST OPERATIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        
        {/* Left Greeting & Context */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {greeting}, {user?.name || "Owner"}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>{restaurant?.name || "RESTUVEXO Restaurant"}</span>
            <span>•</span>
            <span className="text-slate-600 font-bold">Today · {todayFormatted}</span>
          </div>
        </div>

        {/* Right Quick Operational Shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <Link
            href="/dashboard/pos"
            className="flex items-center gap-2 bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New POS Bill</span>
          </Link>

          <Link
            href="/dashboard/kds"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <ChefHat className="w-4 h-4 text-orange-400" />
            <span>Kitchen</span>
            {stats?.activeOrdersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-orange-500 text-white ml-0.5">
                {stats.activeOrdersCount}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/tables"
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 text-slate-500" />
            <span>Tables</span>
          </Link>
        </div>
      </div>

      {/* 2. FIVE CORE BUSINESS KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Today's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sales</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#ff5722] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ₹{Number(stats?.todayRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Today's Revenue</p>
          </div>
        </div>

        {/* Card 2: Today's Orders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Orders</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats?.totalOrdersTodayCount || (stats?.completedOrdersTodayCount || 0) + (stats?.activeOrdersCount || 0) || 0}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
              {stats?.completedOrdersTodayCount || 0} completed
            </p>
          </div>
        </div>

        {/* Card 3: Active KOTs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active KOTs</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
              {stats?.activeOrdersCount || 0}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">In Kitchen / Tables</p>
          </div>
        </div>

        {/* Card 4: Tables Occupancy */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tables</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats?.tablesOccupied || 0} / {stats?.tablesTotal || 0}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
              {stats?.tablesFree || 0} free tables
            </p>
          </div>
        </div>

        {/* Card 5: Estimated Gross Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Profit</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
              ₹{Number(stats?.todayProfit || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Sales − Food Cost</p>
          </div>
        </div>

      </div>

      {/* 3. SLEEK COMPACT 7-DAY SALES TREND GRAPH */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">7-Day Sales Trend</span>
            <span className="text-sm font-bold text-slate-800">Daily Revenue Velocity</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 block">7-Day Total</span>
            <span className="text-base font-black text-slate-900">
              ₹{Number(stats?.last7DaysTotal || stats?.last7Days?.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0) || stats?.todayRevenue || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
        
        {/* Chart Canvas */}
        <div className="h-28 w-full">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* 4. MAIN OPERATIONAL SPLIT: RECENT ORDERS (7/12) + KITCHEN FEED & TOP DISHES (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: LIVE RECENT ORDERS TABLE */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Section Header with Tabs */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Live Recent Orders</h2>
              <p className="text-xs text-slate-400 font-semibold">Real-time incoming dining & takeaway transactions</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setOrderFilter("all")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                  orderFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setOrderFilter("active")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                  orderFilter === "active" ? "bg-white text-orange-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setOrderFilter("completed")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                  orderFilter === "completed" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Done
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                No orders found in this category today
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-3">Table / Type</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3">Total</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredOrders.map((order) => {
                    const itemCount = order.orderItems?.reduce((sum: number, item: any) => sum + (item.qty || 1), 0) || 0;
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          #{order.receiptNo || order.id}
                        </td>
                        <td className="py-3 px-3">
                          {order.table?.tableNo ? (
                            <span className="font-bold text-slate-800">Table {order.table.tableNo}</span>
                          ) : (
                            <span className="text-slate-500 capitalize">{order.orderType?.replace("_", " ") || "Dine in"}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          ₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3">
                          {renderStatusBadge(order.status, order.paymentStatus)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff5722] hover:text-[#e04c1d] bg-orange-50/60 hover:bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/60 transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer View All Link */}
          <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
            <Link
              href="/dashboard/orders"
              className="text-xs font-bold text-[#ff5722] hover:underline inline-flex items-center gap-1"
            >
              <span>View all orders and invoices</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE KITCHEN QUEUE & COMPACT TOP DISHES */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: LIVE KITCHEN QUEUE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#ff5722] flex items-center justify-center">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Live Kitchen Queue</h3>
                  <p className="text-[10px] font-semibold text-slate-400">Active chef preparation tickets</p>
                </div>
              </div>
              <Link
                href="/dashboard/kds"
                className="text-[11px] font-bold text-[#ff5722] hover:underline"
              >
                Open KDS →
              </Link>
            </div>

            {/* KOT List */}
            <div className="space-y-2.5">
              {stats?.recentKots && stats.recentKots.length > 0 ? (
                stats.recentKots.map((kot: any, idx: number) => (
                  <div
                    key={kot.id || idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          KOT #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {kot.table?.tableNo ? `Table ${kot.table.tableNo}` : "Takeaway"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                        {kot.orderItems?.map((it: any) => `${it.qty}x ${it.menuItem?.name || "Dish"}`).join(", ")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 uppercase">
                        {kot.status || "Cooking"}
                      </span>
                      <span className="block text-[9px] font-semibold text-slate-400 mt-1">
                        {getElapsedTime(kot.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                  <ChefHat className="w-6 h-6 mx-auto text-slate-300 mb-1.5 stroke-[1.5]" />
                  Kitchen is all caught up! No active KOTs
                </div>
              )}
            </div>
          </div>

          {/* Card 2: TOP DISHES (COMPACT & CLEAN) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Today's Top Dishes</h3>
                  <p className="text-[10px] font-semibold text-slate-400">Best selling items today</p>
                </div>
              </div>
              <Link
                href="/dashboard/menu"
                className="text-[11px] font-bold text-[#ff5722] hover:underline"
              >
                Menu →
              </Link>
            </div>

            {/* Popular Items List */}
            <div className="space-y-2">
              {stats?.popularItems && stats.popularItems.length > 0 ? (
                stats.popularItems.map((item: any, i: number) => (
                  <div
                    key={item.id || i}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-bold text-slate-800">{item.name}</span>
                    </div>
                    <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg text-[10px]">
                      {item.soldCount || item.qty || 1} sold
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                  <UtensilsCrossed className="w-6 h-6 mx-auto text-slate-300 mb-1.5 stroke-[1.5]" />
                  Sales data will appear after orders are placed
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 5. ORDER BILL / RECEIPT DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Order #{selectedOrder.receiptNo || selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  {selectedOrder.table?.tableNo ? `Table ${selectedOrder.table.tableNo}` : "Takeaway"} •{" "}
                  {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Items List */}
            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-slate-100 text-xs">
              {selectedOrder.orderItems?.map((it: any) => (
                <div key={it.id} className="pt-2 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">{it.menuItem?.name || "Dish Item"}</span>
                    <span className="text-slate-400 text-[11px] block">Qty: {it.qty} × ₹{Number(it.price || 0)}</span>
                  </div>
                  <span className="font-black text-slate-900">₹{Number(it.price * it.qty).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal</span>
                <span>₹{Number(selectedOrder.subtotal || selectedOrder.totalAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              {Number(selectedOrder.discountApplied || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount</span>
                  <span>-₹{Number(selectedOrder.discountApplied).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                <span>Total Paid Amount</span>
                <span>₹{Number(selectedOrder.totalAmount || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
