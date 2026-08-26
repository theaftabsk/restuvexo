import { getBackendUrl } from "@/config/api";
"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Edit2,
  TrendingDown,
  ShoppingBag,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  DollarSign,
  Scale
} from "lucide-react";

export default function InventoryManagement() {
  const [user, setUser] = useState<any>(null);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"stock" | "transactions">("stock");
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "low_stock" | "out_of_stock">("all");
  const [loading, setLoading] = useState(true);

  // Form Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showWastageModal, setShowWastageModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<any>(null);

  // Form Fields
  const [addFormData, setAddFormData] = useState({
    itemName: "",
    currentStock: "0",
    baseUnit: "kg",
    reorderLevel: "5",
    minAlertQty: "2",
    costPerUnit: "0"
  });

  const [purchaseData, setPurchaseData] = useState({
    inventoryId: "",
    qtyPurchased: "",
    costPerUnit: "",
    invoiceNo: "",
    supplierName: ""
  });

  const [wastageData, setWastageData] = useState({
    inventoryId: "",
    qtyWasted: "",
    reason: "Spoilage"
  });

  const [adjustmentData, setAdjustmentData] = useState({
    inventoryId: "",
    newPhysicalCount: "",
    reason: "Physical count mismatch"
  });

  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  const BACKEND_URL = getBackendUrl();

  const triggerToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }

    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          if (userObj.restaurantId) {
            socket.emit("join_restaurant", userObj.restaurantId);
          }
        } catch (e) {}
      }
    });

    socket.on("inventory_updated", () => {
      fetchInventory(currentPage, true);
      if (activeTab === "transactions") {
        fetchTransactions(1, true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "stock") {
      fetchInventory(currentPage);
    } else {
      fetchTransactions(currentPage);
    }
  }, [currentPage, activeTab, filterStatus]);

  const fetchInventory = async (page = 1, isSilent = false) => {
    if (!isSilent) setLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/inventory?page=${page}&limit=50&search=${encodeURIComponent(searchQuery)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.ok) {
        const json = await res.json();
        setInventoryList(json.data || []);
        if (json.pagination) setPaginationMeta(json.pagination);
      }
    } catch (error) {
      console.error("Failed to load inventory:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchTransactions = async (page = 1, isSilent = false) => {
    if (!isSilent) setLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/transactions?page=${page}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setTransactionsList(json.data || []);
        if (json.pagination) setPaginationMeta(json.pagination);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // 1. Handle Add New Raw Material
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.itemName || !addFormData.baseUnit) {
      triggerToast("Please enter material name and measurement unit", "error");
      return;
    }

    setFormLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          itemName: addFormData.itemName.trim(),
          currentStock: parseFloat(addFormData.currentStock) || 0,
          baseUnit: addFormData.baseUnit.trim(),
          reorderLevel: parseFloat(addFormData.reorderLevel) || 5,
          minAlertQty: parseFloat(addFormData.minAlertQty) || 2,
          costPerUnit: parseFloat(addFormData.costPerUnit) || 0
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast("Raw material added successfully!", "success");
        setShowAddModal(false);
        setAddFormData({
          itemName: "",
          currentStock: "0",
          baseUnit: "kg",
          reorderLevel: "5",
          minAlertQty: "2",
          costPerUnit: "0"
        });
        fetchInventory(1);
      } else {
        triggerToast(data.error || "Failed to add raw material", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "Network error", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // 2. Handle Purchase Submission
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseData.inventoryId || !purchaseData.qtyPurchased) {
      triggerToast("Please select material and enter purchased quantity", "error");
      return;
    }

    setFormLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          inventoryId: purchaseData.inventoryId,
          qtyPurchased: parseFloat(purchaseData.qtyPurchased),
          costPerUnit: parseFloat(purchaseData.costPerUnit || "0"),
          invoiceNo: purchaseData.invoiceNo,
          supplierName: purchaseData.supplierName
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast("Stock purchase recorded to ledger!", "success");
        setShowPurchaseModal(false);
        setPurchaseData({
          inventoryId: "",
          qtyPurchased: "",
          costPerUnit: "",
          invoiceNo: "",
          supplierName: ""
        });
        fetchInventory(currentPage);
      } else {
        triggerToast(data.error || "Failed to record purchase", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "Network error", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // 3. Handle Wastage Submission
  const handleWastageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wastageData.inventoryId || !wastageData.qtyWasted) {
      triggerToast("Please select material and enter wastage quantity", "error");
      return;
    }

    setFormLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/wastage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          inventoryId: wastageData.inventoryId,
          qtyWasted: parseFloat(wastageData.qtyWasted),
          reason: wastageData.reason
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast("Wastage logged and stock updated!", "success");
        setShowWastageModal(false);
        setWastageData({ inventoryId: "", qtyWasted: "", reason: "Spoilage" });
        fetchInventory(currentPage);
      } else {
        triggerToast(data.error || "Failed to log wastage", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "Network error", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // 4. Handle Adjustment Submission
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentData.inventoryId || adjustmentData.newPhysicalCount === "") {
      triggerToast("Please enter audited physical stock count", "error");
      return;
    }

    setFormLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/adjustment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          inventoryId: adjustmentData.inventoryId,
          newPhysicalCount: parseFloat(adjustmentData.newPhysicalCount),
          reason: adjustmentData.reason
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast("Stock count adjusted and audited!", "success");
        setShowAdjustmentModal(false);
        setAdjustmentData({
          inventoryId: "",
          newPhysicalCount: "",
          reason: "Physical count mismatch"
        });
        fetchInventory(currentPage);
      } else {
        triggerToast(data.error || "Failed to adjust stock", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "Network error", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Filtered List
  const filteredInventory = inventoryList.filter((item) => {
    if (filterStatus === "low_stock") return item.status === "low_stock" || item.status === "critical";
    if (filterStatus === "out_of_stock") return item.status === "out_of_stock";
    return true;
  });

  const lowStockCount = inventoryList.filter((i) => i.status === "low_stock" || i.status === "critical").length;
  const outOfStockCount = inventoryList.filter((i) => i.status === "out_of_stock").length;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 lg:p-6 text-slate-800 font-sans">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 text-[#ff5722]">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Smart Inventory & Recipe BOM</h1>
              <p className="text-xs text-slate-500 font-medium">Real-time raw ingredient tracking, purchase orders & audit ledger</p>
            </div>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setPurchaseData({ inventoryId: inventoryList[0]?.id?.toString() || "", qtyPurchased: "", costPerUnit: "", invoiceNo: "", supplierName: "" });
              setShowPurchaseModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Purchase Stock</span>
          </button>

          <button
            onClick={() => {
              setWastageData({ inventoryId: inventoryList[0]?.id?.toString() || "", qtyWasted: "", reason: "Spoilage" });
              setShowWastageModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <TrendingDown className="w-4 h-4" />
            <span>Log Wastage</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-orange-400" />
            <span>+ New Material</span>
          </button>
        </div>
      </div>

      {/* KPI STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Materials</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{inventoryList.length}</span>
            <span className="text-xs font-bold text-slate-500">Tracked</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-amber-500">Low Stock Alert</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600">{lowStockCount}</span>
            <span className="text-xs font-bold text-amber-600">Reorder soon</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-rose-500">Out of Stock</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-600">{outOfStockCount}</span>
            <span className="text-xs font-bold text-rose-600">Blocking POS</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Stock Security</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700">100%</span>
            <span className="text-xs font-bold text-emerald-600">Idempotent</span>
          </div>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab("stock"); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "stock" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Package className="w-3.5 h-3.5 text-[#ff5722]" />
            <span>Live Stock Matrix ({inventoryList.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab("transactions"); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "transactions" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span>Audit Transaction Ledger</span>
          </button>
        </div>

        {/* Filter & Search */}
        {activeTab === "stock" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus("low_stock")}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === "low_stock" ? "bg-amber-100 text-amber-900 shadow-xs" : "text-slate-500"
                }`}
              >
                Low ({lowStockCount})
              </button>
              <button
                onClick={() => setFilterStatus("out_of_stock")}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === "out_of_stock" ? "bg-rose-100 text-rose-900 shadow-xs" : "text-slate-500"
                }`}
              >
                Zero ({outOfStockCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search raw material..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchInventory(1);
                }}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: LIVE STOCK TABLE */}
      {activeTab === "stock" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Ingredient Name</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Cost / Unit</th>
                  <th className="py-3 px-4">Reorder Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      Syncing inventory balances...
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      No ingredients found. Click "+ New Material" to add.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-black text-slate-900">{item.itemName}</td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-black text-slate-900">
                          {Number(item.currentStock).toFixed(3)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-500 uppercase">{item.baseUnit}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">₹{Number(item.costPerUnit).toFixed(2)}</td>
                      <td className="py-3 px-4 font-bold text-slate-500">{Number(item.reorderLevel).toFixed(2)} {item.baseUnit}</td>
                      <td className="py-3 px-4">
                        {item.status === "out_of_stock" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            <span>Out of Stock</span>
                          </span>
                        ) : item.status === "critical" || item.status === "low_stock" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Normal</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Audit / Count Adjust"
                            onClick={() => {
                              setAdjustmentData({
                                inventoryId: item.id.toString(),
                                newPhysicalCount: item.currentStock.toString(),
                                reason: "Physical count mismatch"
                              });
                              setSelectedItemForAction(item);
                              setShowAdjustmentModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>

                          <button
                            title="Purchase Stock"
                            onClick={() => {
                              setPurchaseData({
                                inventoryId: item.id.toString(),
                                qtyPurchased: "",
                                costPerUnit: item.costPerUnit.toString(),
                                invoiceNo: "",
                                supplierName: ""
                              });
                              setSelectedItemForAction(item);
                              setShowPurchaseModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRANSACTION LEDGER */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Qty Delta</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Cost @ Tx</th>
                  <th className="py-3 px-4">Note / Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      Loading audit ledger...
                    </td>
                  </tr>
                ) : transactionsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactionsList.map((tx) => {
                    const isPositive = Number(tx.qtyDelta) > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-medium text-slate-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">
                          {tx.inventory?.itemName || "Ingredient"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              tx.txType === "purchase"
                                ? "bg-emerald-100 text-emerald-800"
                                : tx.txType === "recipe_consumption"
                                ? "bg-blue-100 text-blue-800"
                                : tx.txType === "wastage"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {tx.txType.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black">
                          <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                            {isPositive ? `+${Number(tx.qtyDelta).toFixed(3)}` : Number(tx.qtyDelta).toFixed(3)}{" "}
                            {tx.inventory?.baseUnit || "kg"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {Number(tx.balanceAfter).toFixed(3)} {tx.inventory?.baseUnit || "kg"}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          ₹{Number(tx.costAtTx || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">{tx.note || tx.sourceType || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW RAW MATERIAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-1">Add Raw Material</h3>
            <p className="text-xs text-slate-500 mb-4">Register raw ingredient for recipe BOM linking</p>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raw Chicken, Mozzarella Cheese"
                  value={addFormData.itemName}
                  onChange={(e) => setAddFormData({ ...addFormData, itemName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600">Opening Stock</label>
                  <input
                    type="number"
                    step="0.001"
                    value={addFormData.currentStock}
                    onChange={(e) => setAddFormData({ ...addFormData, currentStock: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600">Base Unit *</label>
                  <select
                    value={addFormData.baseUnit}
                    onChange={(e) => setAddFormData({ ...addFormData, baseUnit: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="ltr">ltr (Liters)</option>
                    <option value="pcs">pcs (Pieces / Units)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600">Reorder Level</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addFormData.reorderLevel}
                    onChange={(e) => setAddFormData({ ...addFormData, reorderLevel: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600">Cost per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addFormData.costPerUnit}
                    onChange={(e) => setAddFormData({ ...addFormData, costPerUnit: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-black transition shadow-xs cursor-pointer"
                >
                  {formLoading ? "Saving..." : "Save Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG PURCHASE */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-black text-slate-900">Log Stock Purchase</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Increases ingredient inventory and computes weighted average cost</p>

            <form onSubmit={handlePurchaseSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Select Material *</label>
                <select
                  required
                  value={purchaseData.inventoryId}
                  onChange={(e) => setPurchaseData({ ...purchaseData, inventoryId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  {inventoryList.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemName} (Current: {Number(i.currentStock).toFixed(2)} {i.baseUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600">Quantity Purchased *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="e.g. 10.0"
                    value={purchaseData.qtyPurchased}
                    onChange={(e) => setPurchaseData({ ...purchaseData, qtyPurchased: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600">Purchase Rate / Unit (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 260"
                    value={purchaseData.costPerUnit}
                    onChange={(e) => setPurchaseData({ ...purchaseData, costPerUnit: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600">Supplier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Wholesale"
                    value={purchaseData.supplierName}
                    onChange={(e) => setPurchaseData({ ...purchaseData, supplierName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600">Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-90"
                    value={purchaseData.invoiceNo}
                    onChange={(e) => setPurchaseData({ ...purchaseData, invoiceNo: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs cursor-pointer"
                >
                  {formLoading ? "Recording..." : "Record Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG WASTAGE */}
      {showWastageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              <h3 className="text-lg font-black text-slate-900">Log Kitchen Wastage</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Record spoilage, burnt or expired ingredients</p>

            <form onSubmit={handleWastageSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Select Material *</label>
                <select
                  required
                  value={wastageData.inventoryId}
                  onChange={(e) => setWastageData({ ...wastageData, inventoryId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  {inventoryList.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemName} (Current: {Number(i.currentStock).toFixed(2)} {i.baseUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Wasted Quantity *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="e.g. 1.2"
                  value={wastageData.qtyWasted}
                  onChange={(e) => setWastageData({ ...wastageData, qtyWasted: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Reason</label>
                <select
                  value={wastageData.reason}
                  onChange={(e) => setWastageData({ ...wastageData, reason: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="Spoilage / Expired">Spoilage / Expired</option>
                  <option value="Burnt during preparation">Burnt during preparation</option>
                  <option value="Customer Return">Customer Return</option>
                  <option value="Storage Leakage">Storage Leakage</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWastageModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-xs cursor-pointer"
                >
                  {formLoading ? "Recording..." : "Log Wastage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PHYSICAL AUDIT ADJUSTMENT */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-black text-slate-900">Physical Stock Count Adjustment</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Reconcile physical stock count with system ledger</p>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Material</label>
                <input
                  type="text"
                  disabled
                  value={selectedItemForAction?.itemName || ""}
                  className="w-full mt-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Audited Physical Count *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="e.g. 7.5"
                  value={adjustmentData.newPhysicalCount}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, newPhysicalCount: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Adjustment Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly physical audit count"
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition shadow-xs cursor-pointer"
                >
                  {formLoading ? "Adjusting..." : "Commit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-black text-white flex items-center gap-2 animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
              ? "bg-rose-600"
              : "bg-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{toast.msg}</span>
        </div>
      )}

    </div>
  );
}
