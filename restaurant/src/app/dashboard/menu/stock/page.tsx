"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";

export default function MenuStockManagement() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'tracked' | 'untracked'
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  // Inline editing state: { [itemId]: { stockQty, costPrice } }
  const [editState, setEditState] = useState({});

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const triggerToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  const fetchAllMenuItems = useCallback(async (silent = false) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/menu-items?limit=200&page=1&showAll=true`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const items = (json.data || []).map(item => ({
          ...item,
          price: parseFloat(item.price),
          costPrice: parseFloat(item.costPrice),
          stockQty: parseInt(item.stockQty)
        }));
        setMenuItems(items);
      }
    } catch (e) {
      console.error("Failed to load menu items:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchAllMenuItems();

    const socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: true });
    socket.on("connect", () => {
      const userStr = localStorage.getItem("user");
      try {
        const u = JSON.parse(userStr || "{}");
        if (u.restaurantId) socket.emit("join_restaurant", u.restaurantId);
      } catch (e) {}
    });
    socket.on("menu_updated", () => fetchAllMenuItems(true));
    return () => {
      socket.disconnect();
    };
  }, []);

  // Toggle trackStock for one item immediately
  const handleToggleTrackStock = async (item) => {
    const token = localStorage.getItem("authToken");
    const newVal = !item.trackStock;

    // Optimistic update
    setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, trackStock: newVal } : m));

    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ trackStock: newVal })
      });
      if (!res.ok) throw new Error("Failed");
      triggerToast(`Stock tracking ${newVal ? "enabled" : "disabled"} for "${item.name}"`, newVal ? "success" : "info");
    } catch (e) {
      // Revert on failure
      setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, trackStock: !newVal } : m));
      triggerToast("Failed to update stock tracking.", "error");
    }
  };

  // Save inline edits (stockQty & costPrice) for one item
  const handleSaveInlineEdit = async (item) => {
    const token = localStorage.getItem("authToken");
    const edits = editState[item.id] || {};
    const newStock = edits.stockQty !== undefined ? parseInt(edits.stockQty) : item.stockQty;
    const newCost = edits.costPrice !== undefined ? parseFloat(edits.costPrice) : item.costPrice;

    if (isNaN(newStock) || newStock < 0) {
      triggerToast("Stock quantity must be a positive number.", "error");
      return;
    }
    if (isNaN(newCost) || newCost < 0) {
      triggerToast("Cost price must be a positive number.", "error");
      return;
    }

    setSavingId(item.id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ stockQty: newStock, costPrice: newCost })
      });
      if (!res.ok) throw new Error("Failed to save");
      
      setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, stockQty: newStock, costPrice: newCost } : m));
      setEditState(prev => { const next = { ...prev }; delete next[item.id]; return next; });
      triggerToast(`"${item.name}" stock & cost updated!`, "success");
    } catch (e) {
      triggerToast("Failed to save changes.", "error");
    } finally {
      setSavingId(null);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterMode === "all" || 
      (filterMode === "tracked" && item.trackStock) || 
      (filterMode === "untracked" && !item.trackStock);
    return matchSearch && matchFilter;
  });

  // Compute stats
  const trackedCount = menuItems.filter(m => m.trackStock).length;
  const outOfStockCount = menuItems.filter(m => m.trackStock && m.stockQty <= 0).length;
  const lowStockCount = menuItems.filter(m => m.trackStock && m.stockQty > 0 && m.stockQty <= 10).length;
  const totalStockValue = menuItems
    .filter(m => m.trackStock)
    .reduce((sum, m) => sum + m.costPrice * m.stockQty, 0);

  if (loading) {
    return <LoadingScreen message="Syncing stock ledger..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-12">

      {/* Toast */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : toast.type === "info"
              ? "bg-slate-50 border-slate-200 text-slate-700"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700"
          }`}>
            <span className="w-2 h-2 rounded-full bg-current shrink-0" />
            <p className="text-[11px] font-black tracking-wide uppercase">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="text-left">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Menu Stock Control</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Enable tracking, set quantities, and manage cost prices per menu item
          </p>
        </div>
        <Link
          href="/dashboard/menu"
          className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-2xl transition active:scale-95 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Menu Catalog
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-xl shadow-slate-100/40 text-left">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tracked Items</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{trackedCount}</span>
          <span className="text-[9px] text-slate-400 font-semibold">of {menuItems.length} total items</span>
        </div>
        <div className={`border p-5 rounded-[1.5rem] shadow-xl text-left ${outOfStockCount > 0 ? "bg-rose-50/50 border-rose-200 shadow-rose-100/40" : "bg-white border-slate-100 shadow-slate-100/40"}`}>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Out of Stock</span>
          <span className={`text-2xl font-black mt-1 block ${outOfStockCount > 0 ? "text-rose-600" : "text-slate-900"}`}>{outOfStockCount}</span>
          <span className="text-[9px] text-slate-400 font-semibold">tracked items exhausted</span>
        </div>
        <div className={`border p-5 rounded-[1.5rem] shadow-xl text-left ${lowStockCount > 0 ? "bg-amber-50/50 border-amber-200 shadow-amber-100/40" : "bg-white border-slate-100 shadow-slate-100/40"}`}>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Low Stock (&le;10)</span>
          <span className={`text-2xl font-black mt-1 block ${lowStockCount > 0 ? "text-amber-600" : "text-slate-900"}`}>{lowStockCount}</span>
          <span className="text-[9px] text-slate-400 font-semibold">items need restocking</span>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-xl shadow-slate-100/40 text-left">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Stock Value (Cost)</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">₹{totalStockValue.toFixed(0)}</span>
          <span className="text-[9px] text-slate-400 font-semibold">tracked items only</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by dish or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#ff5722] focus:ring-2 focus:ring-[#ff5722]/10 transition"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl text-[10px] font-black">
          {[
            { key: "all", label: `All (${menuItems.length})` },
            { key: "tracked", label: `Tracked (${trackedCount})` },
            { key: "untracked", label: `Untracked (${menuItems.length - trackedCount})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterMode(tab.key)}
              className={`px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap ${
                filterMode === tab.key
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-100/40">
        
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ff5722]/10 border border-[#ff5722]/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-[#ff5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="font-black text-slate-950 text-sm">Stock Ledger</h3>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[9px] font-black uppercase text-slate-500 tracking-wider">
            {filteredItems.length} Items
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-slate-400 text-xs font-semibold">No items match your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold text-slate-600 bg-white">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-5 pl-7">Dish Name</th>
                  <th className="p-5">Category</th>
                  <th className="p-5 text-center">Track Stock</th>
                  <th className="p-5">Qty in Stock</th>
                  <th className="p-5">Cost Price (₹)</th>
                  <th className="p-5">Sell Price (₹)</th>
                  <th className="p-5">Margin</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right pr-7">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map(item => {
                  const edits = editState[item.id] || {};
                  const currentStock = edits.stockQty !== undefined ? edits.stockQty : item.stockQty;
                  const currentCost = edits.costPrice !== undefined ? edits.costPrice : item.costPrice;
                  const isDirty = edits.stockQty !== undefined || edits.costPrice !== undefined;
                  const isSaving = savingId === item.id;

                  const costNum = parseFloat(currentCost) || 0;
                  const sellNum = item.price;
                  const profit = sellNum - costNum;
                  const margin = sellNum > 0 ? ((profit / sellNum) * 100).toFixed(1) : "0";
                  const isGoodMargin = parseFloat(margin) >= 40;
                  const isZeroMargin = costNum === 0;

                  const isOutOfStock = item.trackStock && item.stockQty <= 0;
                  const isLowStock = item.trackStock && item.stockQty > 0 && item.stockQty <= 10;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/40 transition-colors ${isOutOfStock ? "bg-rose-50/20" : ""}`}>
                      
                      {/* Name */}
                      <td className="p-5 pl-7">
                        <p className="font-black text-slate-900 text-sm leading-snug">{item.name}</p>
                      </td>

                      {/* Category */}
                      <td className="p-5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[9px] font-black text-slate-600 uppercase tracking-wide whitespace-nowrap">
                          {item.category?.name || "—"}
                        </span>
                      </td>

                      {/* Track Stock Toggle */}
                      <td className="p-5 text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleToggleTrackStock(item)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                              item.trackStock ? "bg-[#ff5722]" : "bg-slate-200"
                            }`}
                            title={item.trackStock ? "Click to disable stock tracking" : "Click to enable stock tracking"}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                              item.trackStock ? "translate-x-6" : "translate-x-1"
                            }`} />
                          </button>
                        </div>
                      </td>

                      {/* Stock Qty (inline editable) */}
                      <td className="p-5">
                        {item.trackStock ? (
                          <input
                            type="number"
                            min="0"
                            value={currentStock}
                            onChange={e => setEditState(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], stockQty: e.target.value }
                            }))}
                            className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:bg-white rounded-xl text-slate-900 text-xs font-black focus:outline-none transition"
                          />
                        ) : (
                          <span className="text-slate-300 font-bold text-[10px] uppercase tracking-wide">Not tracked</span>
                        )}
                      </td>

                      {/* Cost Price (inline editable) */}
                      <td className="p-5">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentCost}
                            onChange={e => setEditState(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], costPrice: e.target.value }
                            }))}
                            className="w-24 pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:bg-white rounded-xl text-slate-900 text-xs font-black focus:outline-none transition"
                          />
                        </div>
                      </td>

                      {/* Selling Price (read-only) */}
                      <td className="p-5">
                        <span className="text-slate-900 font-black">₹{item.price.toFixed(2)}</span>
                      </td>

                      {/* Margin */}
                      <td className="p-5">
                        {isZeroMargin ? (
                          <span className="text-slate-300 text-[10px] font-black uppercase">No cost set</span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className={`text-xs font-black ${isGoodMargin ? "text-emerald-600" : "text-amber-600"}`}>
                              {margin}%
                            </span>
                            <p className={`text-[9px] font-bold ${profit >= 0 ? "text-slate-400" : "text-rose-500"}`}>
                              ₹{profit.toFixed(2)} / dish
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="p-5">
                        {!item.trackStock ? (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-wide whitespace-nowrap">
                            Bypassed
                          </span>
                        ) : isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[9px] font-black text-rose-600 uppercase tracking-wide whitespace-nowrap animate-pulse">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[9px] font-black text-amber-600 uppercase tracking-wide whitespace-nowrap">
                            Low: {item.stockQty} left
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[9px] font-black text-emerald-700 uppercase tracking-wide whitespace-nowrap">
                            {item.stockQty} in stock
                          </span>
                        )}
                      </td>

                      {/* Save Button */}
                      <td className="p-5 text-right pr-7">
                        {isDirty ? (
                          <button
                            onClick={() => handleSaveInlineEdit(item)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-[#ff5722] hover:bg-[#e64a19] text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/20 transition active:scale-95 disabled:opacity-60 whitespace-nowrap"
                          >
                            {isSaving ? "Saving..." : "Save Changes"}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[9px] font-black uppercase tracking-wide">No changes</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helper info card */}
      <div className="bg-white border border-slate-100 p-6 rounded-[1.5rem] shadow-xl shadow-slate-100/40 flex items-start gap-4 text-left">
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#ff5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">How Item-Level Stock Works</h4>
          <p className="text-[11px] text-slate-450 font-medium leading-relaxed">
            Toggle the <strong>Track Stock</strong> switch to enable or disable stock enforcement per item. When enabled, POS billing and the customer QR ordering portal will block orders exceeding available quantity. Edit <strong>Qty in Stock</strong> and <strong>Cost Price</strong> inline and click <strong>Save Changes</strong> to persist.
          </p>
        </div>
      </div>

    </div>
  );
}
