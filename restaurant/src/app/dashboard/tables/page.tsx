import { getBackendUrl } from "@/config/api";
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import LoadingScreen from "@/components/LoadingScreen";
import {
  LayoutGrid,
  Plus,
  Search,
  Download,
  Printer,
  History,
  QrCode as QrIcon,
  Trash2,
  Edit2,
  Users,
  Clock,
  IndianRupee,
  ChevronRight,
  X,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Flame,
  CheckCircle2,
  Eye,
  RefreshCw,
  Building,
  Maximize2,
  UtensilsCrossed,
  Calendar,
  Filter,
  Zap
} from "lucide-react";

export default function TableManagerDashboard() {
  const [tables, setTables] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [qrOrderingEnabled, setQrOrderingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" | "info" }>({
    show: false,
    message: "",
    type: "info"
  });
  const [restaurant, setRestaurant] = useState<any>(null);

  // Floor Tabs & Filter State
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "free">("all");

  // Table History Drawer Date Filter State
  const [drawerDateFilter, setDrawerDateFilter] = useState<"all" | "today" | "yesterday" | "7days" | "month" | "custom">("all");
  const [drawerCustomStartDate, setDrawerCustomStartDate] = useState("");
  const [drawerCustomEndDate, setDrawerCustomEndDate] = useState("");

  // Table Add / Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editTableId, setEditTableId] = useState<number | null>(null);
  const [tableNoInput, setTableNoInput] = useState("");
  const [floorSectionInput, setFloorSectionInput] = useState("Ground Floor");
  const [capacityInput, setCapacityInput] = useState<number>(4);

  // Table Order History Drawer State
  const [historyDrawer, setHistoryDrawer] = useState<{
    open: boolean;
    table: any | null;
    loading: boolean;
    data: any | null;
  }>({
    open: false,
    table: null,
    loading: false,
    data: null
  });

  // Standee Theme Modal & Bulk Print Modal
  const [printStandeeModal, setPrintStandeeModal] = useState<{
    show: boolean;
    table: any | null;
    theme: "sunset" | "dark" | "gold";
  }>({
    show: false,
    table: null,
    theme: "sunset"
  });
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);

  // QR URLs cache
  const [qrUrls, setQrUrls] = useState<{ [key: string]: string }>({});

  const BACKEND_URL = getBackendUrl();

  const getCustomerOrigin = () => {
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:3001";
      }
      return window.location.origin.replace(":3000", ":3001");
    }
    return "http://localhost:3001";
  };

  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  // 1. Fetch All Tables, Sessions, and Orders
  const fetchTablesAndData = async (silent = false) => {
    if (!silent) setLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const [tablesRes, ordersRes, settingsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/tables?_=${Date.now()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch(`${BACKEND_URL}/api/order?_=${Date.now()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch(`${BACKEND_URL}/api/tables/settings?_=${Date.now()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);

      if (tablesRes.ok) {
        const tData = await tablesRes.json();
        const tableList = Array.isArray(tData) ? tData : tData.data || [];
        setTables(tableList);

        // Generate QRs locally for offline reliability
        const origin = getCustomerOrigin();
        const urlsMap: { [key: string]: string } = {};
        for (const t of tableList) {
          const targetUrl = `${origin}/menu?qr=${t.qrCode}`;
          try {
            const dataUrl = await QRCode.toDataURL(targetUrl, {
              width: 320,
              margin: 1,
              color: { dark: "#0f172a", light: "#ffffff" }
            });
            urlsMap[t.id] = dataUrl;
          } catch (e) {}
        }
        setQrUrls(urlsMap);
      }

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        const allOrders = Array.isArray(oData) ? oData : oData.data || [];
        const unpaid = allOrders.filter((o: any) => o.paymentStatus === "unpaid" && !o.isMerged);
        setActiveOrders(unpaid);
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.qrOrderingEnabled !== undefined) {
          setQrOrderingEnabled(sData.qrOrderingEnabled);
        }
      }
    } catch (err) {
      console.error("Error fetching tables data:", err);
      if (!silent) triggerToast("Could not connect to server", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const storedRest = localStorage.getItem("restaurant");
    if (storedRest) setRestaurant(JSON.parse(storedRest));
    fetchTablesAndData();

    // Socket.io Real-time Live Connection
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u.restaurantId) socket.emit("join_restaurant", u.restaurantId);
        } catch (e) {}
      }
    });

    const handleSync = () => fetchTablesAndData(true);
    socket.on("table_updated", handleSync);
    socket.on("new_order_placed", handleSync);
    socket.on("order_status_updated", handleSync);
    socket.on("order_deleted", handleSync);

    return () => {
      socket.disconnect();
    };
  }, []);

  const formatTableTitle = (raw: string | number) => {
    const str = String(raw || "").trim();
    const cleanNum = str.replace(/^Table\s+/i, "");
    return `Table ${cleanNum}`;
  };

  // Extract Floor / Section from Table Name or assign smart default
  const getTableFloor = (table: any) => {
    const name = String(table.tableNo || "").toLowerCase();
    if (name.includes("ac") || name.includes("a/c")) return "1st Floor AC";
    if (name.includes("roof") || name.includes("bar")) return "Rooftop Lounge";
    if (name.includes("garden") || name.includes("patio")) return "Outdoor Patio";
    
    // Numeric partitioning if >= 12 tables
    const num = parseInt(name.replace(/[^0-9]/g, "")) || 0;
    if (num >= 21) return "Rooftop Lounge";
    if (num >= 11) return "1st Floor AC";
    return "Ground Floor";
  };

  // Distinct Floor Sections
  const floorSections = useMemo(() => {
    const floors = new Set<string>();
    tables.forEach((t) => floors.add(getTableFloor(t)));
    return ["all", ...Array.from(floors)];
  }, [tables]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const orderOnTable = activeOrders.find(
        (o) => (o.tableId === t.id || o.table?.id === t.id) && o.paymentStatus === "unpaid"
      );
      const floor = getTableFloor(t);

      if (selectedFloor !== "all" && floor !== selectedFloor) return false;
      if (statusFilter === "active" && !orderOnTable) return false;
      if (statusFilter === "free" && orderOnTable) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const tNo = String(t.tableNo).toLowerCase();
        if (!tNo.includes(q) && !floor.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [tables, activeOrders, selectedFloor, statusFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalTables = tables.length;
    const occupiedCount = activeOrders.length;
    const freeCount = Math.max(0, totalTables - occupiedCount);
    const occupancyRate = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;
    const totalCapacity = totalTables * 4; // Standard 4-seater estimate
    const activeRevenue = activeOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return {
      totalTables,
      occupiedCount,
      freeCount,
      occupancyRate,
      totalCapacity,
      activeRevenue
    };
  }, [tables, activeOrders]);

  // Dynamic Date-Filtered Orders & Stats for Table History Drawer
  const filteredDrawerOrders = useMemo(() => {
    if (!historyDrawer.data?.orders) return [];
    const orders: any[] = historyDrawer.data.orders;
    if (drawerDateFilter === "all") return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 6 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return orders.filter((o: any) => {
      const oTime = new Date(o.createdAt).getTime();
      if (drawerDateFilter === "today") return oTime >= startOfToday;
      if (drawerDateFilter === "yesterday") return oTime >= startOfYesterday && oTime < startOfToday;
      if (drawerDateFilter === "7days") return oTime >= startOf7Days;
      if (drawerDateFilter === "month") return oTime >= startOfMonth;
      if (drawerDateFilter === "custom") {
        const s = drawerCustomStartDate ? new Date(drawerCustomStartDate).setHours(0, 0, 0, 0) : 0;
        const e = drawerCustomEndDate ? new Date(drawerCustomEndDate).setHours(23, 59, 59, 999) : Infinity;
        return oTime >= s && oTime <= e;
      }
      return true;
    });
  }, [historyDrawer.data, drawerDateFilter, drawerCustomStartDate, drawerCustomEndDate]);

  const drawerStats = useMemo(() => {
    const total = filteredDrawerOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);
    const paidCount = filteredDrawerOrders.filter((o: any) => o.paymentStatus === "paid").length;
    const avgTicket = filteredDrawerOrders.length > 0 ? Math.round(total / filteredDrawerOrders.length) : 0;
    return {
      total,
      paidCount,
      avgTicket,
      count: filteredDrawerOrders.length
    };
  }, [filteredDrawerOrders]);

  // 2. Add / Edit Table Action
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNoInput.trim()) {
      triggerToast("Please enter table number or name", "error");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      if (modalMode === "add") {
        const res = await fetch(`${BACKEND_URL}/api/tables`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            tableNo: tableNoInput.trim(),
            capacity: capacityInput,
            floor: floorSectionInput
          })
        });
        if (!res.ok) throw new Error("Failed to add table");
        triggerToast(`Added ${tableNoInput} successfully!`, "success");
      } else if (modalMode === "edit" && editTableId) {
        const res = await fetch(`${BACKEND_URL}/api/tables/${editTableId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            tableNo: tableNoInput.trim(),
            capacity: capacityInput,
            floor: floorSectionInput
          })
        });
        if (!res.ok) throw new Error("Failed to update table");
        triggerToast(`Updated table successfully!`, "success");
      }

      setShowAddModal(false);
      setTableNoInput("");
      fetchTablesAndData(true);
    } catch (err: any) {
      triggerToast(err.message || "Operation failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Delete Table
  const handleDeleteTable = async (table: any) => {
    if (!confirm(`Are you sure you want to delete ${formatTableTitle(table.tableNo)}?`)) return;

    setActionLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/${table.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete table");
      triggerToast(`${formatTableTitle(table.tableNo)} deleted.`, "info");
      fetchTablesAndData(true);
    } catch (err: any) {
      triggerToast(err.message || "Failed to delete", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Fetch Detailed Table History Drawer
  const handleOpenTableHistory = async (table: any) => {
    setHistoryDrawer({
      open: true,
      table,
      loading: true,
      data: null
    });

    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/${table.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load history");
      const historyJson = await res.json();
      setHistoryDrawer({
        open: true,
        table,
        loading: false,
        data: historyJson
      });
    } catch (err) {
      setHistoryDrawer((prev) => ({ ...prev, loading: false }));
      triggerToast("Could not load table history", "error");
    }
  };

  // 5. Export Table Performance to CSV
  const handleExportCSV = () => {
    if (tables.length === 0) {
      triggerToast("No table data to export", "info");
      return;
    }

    const headers = ["Table ID", "Table Name", "Floor / Section", "Status", "Live Order Amount", "QR Code Slug"];
    const rows = tables.map((t) => {
      const order = activeOrders.find((o) => o.tableId === t.id && o.paymentStatus === "unpaid");
      return [
        t.id,
        formatTableTitle(t.tableNo),
        getTableFloor(t),
        order ? "Occupied" : "Free",
        order ? Number(order.totalAmount || 0) : 0,
        t.qrCode || ""
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RESTUVEXO_Table_Performance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast("Table Performance CSV downloaded!", "success");
  };

  if (loading) {
    return <LoadingScreen message="Loading Table Matrix & Floor Analytics..." fullScreen={true} />;
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 p-3 sm:p-5 font-sans space-y-4">
      
      {/* ========================================================
          1. TOP HEADER & OPERATIONAL ACTIONS
          ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Tables & Floor Management</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Multi-floor table layout, live dining occupancy, and performance analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowBulkPrintModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <span>Bulk QR Standees</span>
          </button>

          <Link
            href="/dashboard/pos"
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Open POS Terminal ⚡</span>
          </Link>

          <button
            onClick={() => {
              setModalMode("add");
              setTableNoInput(`Table ${tables.length + 1}`);
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Table</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. FLOOR SUMMARY METRICS (4 Real-Time Cards)
          ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Total Capacity</span>
            <h3 className="text-xl font-black text-slate-900">{metrics.totalCapacity} Seats</h3>
            <span className="text-[10px] font-bold text-slate-500">{metrics.totalTables} Dining Tables</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Floor Occupancy</span>
            <h3 className="text-xl font-black text-slate-900">{metrics.occupiedCount} / {metrics.totalTables}</h3>
            <span className="text-[10px] font-bold text-emerald-600">{metrics.occupancyRate}% Occupied Now</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Active Live Tabs</span>
            <h3 className="text-xl font-black text-orange-600">₹{metrics.activeRevenue.toLocaleString("en-IN")}</h3>
            <span className="text-[10px] font-bold text-slate-500">Unsettled on Tables</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Available Tables</span>
            <h3 className="text-xl font-black text-slate-900">{metrics.freeCount} Free</h3>
            <span className="text-[10px] font-bold text-slate-400">Ready for walk-ins</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ========================================================
          3. FLOOR TABS & FILTER TOOLBAR
          ======================================================== */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Floor Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          {floorSections.map((fl) => {
            const count = fl === "all" ? tables.length : tables.filter((t) => getTableFloor(t) === fl).length;
            const isSelected = selectedFloor === fl;

            return (
              <button
                key={fl}
                onClick={() => setSelectedFloor(fl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#ff5722] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{fl === "all" ? "All Floors" : fl}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Filters & Search */}
        <div className="flex items-center gap-2">
          
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
              }`}
            >
              All ({tables.length})
            </button>

            <button
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition cursor-pointer flex items-center gap-1 ${
                statusFilter === "active" ? "bg-rose-500 text-white shadow-2xs" : "text-slate-600"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-300" />
              <span>Active ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => setStatusFilter("free")}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition cursor-pointer flex items-center gap-1 ${
                statusFilter === "free" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span>Free ({metrics.freeCount})</span>
            </button>
          </div>

          <div className="relative w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold pl-8 pr-6 py-1.5 rounded-xl focus:outline-none focus:border-[#ff5722] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* ========================================================
          4. INTERACTIVE TABLE CARDS GRID (Floor Plan)
          ======================================================== */}
      {filteredTables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 text-xs font-bold space-y-2">
          <LayoutGrid className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
          <p>No tables match your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {filteredTables.map((table) => {
            const orderOnTable = activeOrders.find(
              (o) => (o.tableId === table.id || o.table?.id === table.id) && o.paymentStatus === "unpaid"
            );
            const tableTitle = formatTableTitle(table.tableNo);
            const floorName = getTableFloor(table);
            const qrImg = qrUrls[table.id];

            return (
              <div
                key={table.id}
                className={`bg-white rounded-2xl border transition-all duration-150 shadow-2xs hover:shadow-xs p-4 flex flex-col justify-between space-y-3 relative overflow-hidden ${
                  orderOnTable ? "border-amber-300 ring-1 ring-amber-300/60" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Top Status Accent Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    orderOnTable
                      ? orderOnTable.status === "cooking"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-rose-500"
                      : "bg-emerald-500"
                  }`}
                />

                {/* Table Header: Name + Floor Tag + Status Badge */}
                <div className="flex items-start justify-between gap-2 pt-0.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-black text-slate-900">{tableTitle}</h3>
                      <span className="text-[10px] text-slate-400 font-bold">• {table.capacity || 4} Seats</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 block">{floorName}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                      orderOnTable
                        ? orderOnTable.status === "cooking"
                          ? "bg-amber-100 text-amber-900 animate-pulse"
                          : "bg-rose-100 text-rose-900"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {orderOnTable ? (
                      orderOnTable.status === "cooking" ? (
                        <>
                          <Flame className="w-2.5 h-2.5 text-amber-600" />
                          <span>Cooking</span>
                        </>
                      ) : (
                        <>
                          <UtensilsCrossed className="w-2.5 h-2.5 text-rose-600" />
                          <span>Dining</span>
                        </>
                      )
                    ) : (
                      "Free"
                    )}
                  </span>
                </div>

                {/* Middle: Live Order Info or QR Code Thumbnail */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                  {orderOnTable ? (
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Active Tab</span>
                      <span className="text-base font-black text-slate-900 block leading-tight">
                        ₹{Number(orderOnTable.totalAmount || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 block">
                        #{orderOnTable.receiptNo || orderOnTable.id} • {orderOnTable.orderItems?.length || 0} items
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-emerald-600 block">Table Available</span>
                      <span className="text-xs font-bold text-slate-500 block">Scan to Self-Order</span>
                    </div>
                  )}

                  {qrImg && (
                    <button
                      onClick={() => setPrintStandeeModal({ show: true, table, theme: "sunset" })}
                      title="Click to print Acrylic Standee"
                      className="p-1 bg-white rounded-lg border border-slate-200 hover:border-orange-500 transition cursor-pointer shadow-2xs shrink-0"
                    >
                      <img src={qrImg} alt="QR" className="w-10 h-10 rounded" />
                    </button>
                  )}
                </div>

                {/* Bottom Actions: History Drawer, Edit, QR Standee & Fast POS Billing */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenTableHistory(table)}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition cursor-pointer"
                    >
                      <History className="w-3 h-3 text-indigo-600" />
                      <span>History</span>
                    </button>

                    <Link
                      href={`/dashboard/pos?tableId=${table.id}`}
                      className="px-2 py-1 bg-orange-50 hover:bg-orange-500 text-orange-700 hover:text-white rounded-lg font-black text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Open in POS Terminal"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Bill</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPrintStandeeModal({ show: true, table, theme: "sunset" })}
                      title="Print Table Standee"
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setModalMode("edit");
                        setEditTableId(table.id);
                        setTableNoInput(table.tableNo);
                        setFloorSectionInput(table.floor || getTableFloor(table));
                        setCapacityInput(table.capacity || 4);
                        setShowAddModal(true);
                      }}
                      title="Edit Table Details"
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTable(table)}
                      title="Delete Table"
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          5. SLIDE-OVER DRAWER: TABLE PERFORMANCE & ORDER HISTORY
          ======================================================== */}
      {historyDrawer.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-5 flex flex-col space-y-4 overflow-y-auto font-sans">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    {historyDrawer.table ? formatTableTitle(historyDrawer.table.tableNo) : "Table"} History
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">
                    • {historyDrawer.table ? getTableFloor(historyDrawer.table) : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">Turnover log and receipts for this table</p>
              </div>

              <button
                onClick={() => setHistoryDrawer({ open: false, table: null, loading: false, data: null })}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {historyDrawer.loading ? (
              <div className="py-24 text-center text-slate-400 text-xs font-bold space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-[#ff5722]" />
                <p>Loading table history and receipts...</p>
              </div>
            ) : (
              <div className="space-y-3.5 flex-1">
                
                {/* 1. Interactive Date Filter Toolbar */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#ff5722]" />
                      <span>Filter By Date:</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {filteredDrawerOrders.length} orders found
                    </span>
                  </div>

                  {/* Preset Filter Pills */}
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "all", label: "All Time" },
                      { id: "today", label: "Today 📅" },
                      { id: "yesterday", label: "Yesterday" },
                      { id: "7days", label: "Last 7 Days" },
                      { id: "month", label: "This Month" },
                      { id: "custom", label: "Custom 📆" }
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setDrawerDateFilter(btn.id as any)}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-black transition cursor-pointer text-center ${
                          drawerDateFilter === btn.id
                            ? "bg-[#ff5722] text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Pickers */}
                  {drawerDateFilter === "custom" && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 mt-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block">From Date:</label>
                        <input
                          type="date"
                          value={drawerCustomStartDate}
                          onChange={(e) => setDrawerCustomStartDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-[#ff5722]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block">To Date:</label>
                        <input
                          type="date"
                          value={drawerCustomEndDate}
                          onChange={(e) => setDrawerCustomEndDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-[#ff5722]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Dynamic Summary Metric Chips for Selected Date Range */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-emerald-800">Period Revenue</span>
                    <h4 className="text-base font-black text-emerald-700 leading-tight">
                      ₹{drawerStats.total.toLocaleString("en-IN")}
                    </h4>
                    <span className="text-[9px] font-bold text-emerald-600 block">
                      {drawerStats.paidCount} Paid Bills
                    </span>
                  </div>

                  <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-100 space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-sky-800">Total Orders</span>
                    <h4 className="text-base font-black text-sky-700 leading-tight">
                      {drawerStats.count}
                    </h4>
                    <span className="text-[9px] font-bold text-sky-600 block">
                      Table Turnovers
                    </span>
                  </div>

                  <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100 space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-amber-800">Avg Ticket</span>
                    <h4 className="text-base font-black text-amber-700 leading-tight">
                      ₹{drawerStats.avgTicket}
                    </h4>
                    <span className="text-[9px] font-bold text-amber-600 block">
                      Per Order Avg
                    </span>
                  </div>
                </div>

                {/* 3. Filtered Orders Log */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 block">
                      Dining Orders ({filteredDrawerOrders.length})
                    </span>
                    {drawerDateFilter !== "all" && (
                      <button
                        onClick={() => {
                          setDrawerDateFilter("all");
                          setDrawerCustomStartDate("");
                          setDrawerCustomEndDate("");
                        }}
                        className="text-[9px] font-bold text-rose-500 hover:underline cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>

                  {filteredDrawerOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No orders found for the selected date period.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
                      {filteredDrawerOrders.map((order: any) => (
                        <div
                          key={order.id}
                          className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-1.5 hover:bg-white hover:border-orange-300 transition"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-900">#{order.receiptNo || order.id}</span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                                order.paymentStatus === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </div>

                          {/* Items Breakdown */}
                          <div className="text-[11px] text-slate-600 font-medium space-y-0.5">
                            {order.orderItems?.map((it: any) => (
                              <div key={it.id} className="flex justify-between">
                                <span>• {it.menuItem?.name || "Dish"} x{it.qty}</span>
                                <span className="font-bold text-slate-800">₹{it.price * it.qty}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })},{" "}
                              {new Date(order.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                            <span className="font-black text-slate-900">Total: ₹{order.totalAmount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            <button
              onClick={() => setHistoryDrawer({ open: false, table: null, loading: false, data: null })}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2.5 rounded-xl cursor-pointer"
            >
              Close History Drawer
            </button>

          </div>
        </div>
      )}

      {/* ========================================================
          6. MODAL: ADD / EDIT TABLE MODAL
          ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200">
            <div>
              <h3 className="text-base font-black text-slate-900">
                {modalMode === "add" ? "Add New Dining Table" : "Edit Table Details"}
              </h3>
              <p className="text-xs text-slate-400 font-semibold">Create table number, assign floor, and generate QR</p>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Table Name / Number</label>
                <input
                  type="text"
                  placeholder="e.g. Table 7, AC-04, Rooftop-2"
                  value={tableNoInput}
                  onChange={(e) => setTableNoInput(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff5722]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Floor / Section</label>
                <select
                  value={floorSectionInput}
                  onChange={(e) => setFloorSectionInput(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold bg-white"
                >
                  <option value="Ground Floor">Ground Floor (Main Hall)</option>
                  <option value="1st Floor AC">1st Floor (A/C Family Hall)</option>
                  <option value="Rooftop Lounge">Rooftop / Bar Lounge</option>
                  <option value="Outdoor Patio">Outdoor Garden Patio</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Seating Capacity</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[2, 4, 6, 8].map((cap) => (
                    <button
                      type="button"
                      key={cap}
                      onClick={() => setCapacityInput(cap)}
                      className={`py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                        capacityInput === cap
                          ? "bg-[#ff5722] border-[#ff5722] text-white"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {cap} Seats
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-[#ff5722] hover:bg-[#e04c1d] disabled:opacity-50 text-white text-xs font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  {modalMode === "add" ? "+ Create Table" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          7. MODAL: ACRYLIC TABLE QR STANDEE GENERATOR
          ======================================================== */}
      {printStandeeModal.show && printStandeeModal.table && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Table QR Standee Preview</h3>
              <button
                onClick={() => setPrintStandeeModal({ show: false, table: null, theme: "sunset" })}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Acrylic Card Visual Mockup */}
            <div className="bg-gradient-to-br from-amber-500 via-[#ff5722] to-rose-600 p-6 rounded-2xl text-center text-white space-y-3 shadow-lg">
              <div className="space-y-0.5">
                <h4 className="text-sm font-black tracking-wider uppercase">{restaurant?.name || "RESTUVEXO"}</h4>
                <span className="text-[10px] opacity-90 font-semibold">Contactless Digital Menu & Self-Ordering</span>
              </div>

              <div className="bg-white p-3 rounded-2xl w-36 h-36 mx-auto shadow-md flex items-center justify-center">
                {qrUrls[printStandeeModal.table.id] ? (
                  <img
                    src={qrUrls[printStandeeModal.table.id]}
                    alt="QR"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <QrIcon className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <div className="space-y-0.5">
                <span className="text-xl font-black block tracking-tight">
                  {formatTableTitle(printStandeeModal.table.tableNo)}
                </span>
                <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-black uppercase inline-block">
                  Scan QR with camera to order
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Acrylic Standee</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          8. MODAL: BULK PRINT QR STANDEES SHEET
          ======================================================== */}
      {showBulkPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full max-h-[85vh] rounded-2xl shadow-2xl p-5 space-y-4 overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Bulk Print Table QR Standees</h3>
                <p className="text-xs text-slate-400 font-semibold">Print all {tables.length} table cards on A4 sheets for lamination</p>
              </div>
              <button onClick={() => setShowBulkPrintModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className="bg-gradient-to-br from-amber-500 to-[#ff5722] p-4 rounded-xl text-center text-white space-y-2 shadow-xs"
                >
                  <h5 className="text-xs font-black uppercase truncate">{restaurant?.name || "RESTUVEXO"}</h5>
                  <div className="bg-white p-2 rounded-lg w-24 h-24 mx-auto">
                    {qrUrls[t.id] && <img src={qrUrls[t.id]} alt="QR" className="w-full h-full object-contain" />}
                  </div>
                  <span className="text-xs font-black block">{formatTableTitle(t.tableNo)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkPrintModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print All Standees</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-xl shadow-lg text-xs font-black text-white flex items-center gap-2 animate-fade-in ${
            toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-rose-600" : "bg-slate-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
