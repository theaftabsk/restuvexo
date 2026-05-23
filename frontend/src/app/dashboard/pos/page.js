"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";

export default function PosTerminal() {
  const [user, setUser] = useState(null);

  // Menu data — server-paginated
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuMeta, setMenuMeta] = useState({ total: 0, hasMore: false });
  const [menuLoading, setMenuLoading] = useState(false);
  const [tables, setTables] = useState([]);

  // Selection/filter state
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [activeMobileTab, setActiveMobileTab] = useState("menu");
  const [isCartOpen, setIsCartOpen] = useState(true); // Toggle Cart Sidebar
  const [visibleCount, setVisibleCount] = useState(24);
  const searchDebounceRef = useRef(null);

  // Reset visible slice when filters change
  useEffect(() => { setVisibleCount(24); }, [selectedCategory, searchQuery]);
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("dine_in");
  const [selectedTable, setSelectedTable] = useState("");
  const [editingOrderId, setEditingOrderId] = useState(null);
  
  const [enableGst, setEnableGst] = useState(false);

  // Discount security states
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isDiscountUnlocked, setIsDiscountUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [managerPin, setManagerPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Success receipt modals
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [printedOrder, setPrintedOrder] = useState(null);

  // Custom Toast state (Replaces raw browser alert popups)
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  // Reusable custom notification triggers
  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) return text;
    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-orange-100 text-[#ff5722] rounded-md px-0.5 font-black">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    
    setEnableGst(false);
    
    fetchPosData();

    // Check if redirecting from Orders with a running order to edit
    const savedEditOrderId = localStorage.getItem("editOrderId");
    if (savedEditOrderId) {
      setEditingOrderId(savedEditOrderId);
      
      const savedTable = localStorage.getItem("editOrderTable");
      if (savedTable) setSelectedTable(savedTable);

      const savedType = localStorage.getItem("editOrderType");
      if (savedType) setOrderType(savedType);

      const savedDiscount = localStorage.getItem("editOrderDiscount");
      if (savedDiscount) {
        setDiscountAmount(parseFloat(savedDiscount));
        setIsDiscountUnlocked(true); // Pre-enable manager discount override
      }

      const savedItems = localStorage.getItem("editOrderItems");
      if (savedItems) {
        try {
          const parsedItems = JSON.parse(savedItems);
          const cartItems = parsedItems.map(item => ({
            menuItemId: item.menuItemId,
            name: item.menuItem?.name || item.name,
            price: parseFloat(item.price || item.menuItem?.price || 0),
            qty: item.qty,
            maxStock: item.menuItem?.stockQty || 999,
            note: item.note || ""
          }));
          setCart(cartItems);
        } catch (err) {
          console.error("Failed to restore order items for editing:", err);
        }
      }
      
      // Cleanup localStorage keys to prevent sticky reload state
      localStorage.removeItem("editOrderId");
      localStorage.removeItem("editOrderTable");
      localStorage.removeItem("editOrderItems");
      localStorage.removeItem("editOrderType");
      localStorage.removeItem("editOrderDiscount");
    }
  }, []);

  // ─── Fetch menu items from server with current search+category filters ───────
  const fetchMenuItems = useCallback(async (search, category) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setMenuLoading(true);
    try {
      const params = new URLSearchParams({ limit: 200 });
      if (search)   params.set('search', search);
      if (category && category !== 'All') params.set('category', category);
      const res = await fetch(`${BACKEND_URL}/api/menu/menu-items?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setMenuItems(json.data || []);
        setMenuMeta({ total: json.pagination?.total || 0, hasMore: json.pagination?.hasMore || false });
      }
    } catch (e) {
      console.error("Menu fetch failed:", e);
    } finally {
      setMenuLoading(false);
    }
  }, [BACKEND_URL]);

  // Re-fetch menu when category changes immediately
  useEffect(() => {
    fetchMenuItems(searchQuery, selectedCategory);
  }, [selectedCategory]);

  // Debounced re-fetch when search query changes (300ms delay)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchMenuItems(searchQuery, selectedCategory);
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  // ─── Initial POS boot: load categories + tables in parallel ─────────────────
  const fetchPosData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      window.location.href = "/auth/login";
      return;
    }

    try {
      const catRes = await fetch(`${BACKEND_URL}/api/menu/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (catRes.status === 401) {
        localStorage.clear();
        window.location.href = "/auth/login";
        return;
      }

      const [catJson, tableJson, settingsJson] = await Promise.all([
        catRes.ok ? catRes.json() : [],
        fetch(`${BACKEND_URL}/api/tables`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : []),
        fetch(`${BACKEND_URL}/api/tables/settings`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : null)
      ]);

      if (Array.isArray(catJson)) setCategories(catJson);
      if (Array.isArray(tableJson)) {
        setTables(tableJson);
        let initialTableSelected = false;
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const tableQuery = params.get("table") || params.get("tableNo");
          if (tableQuery) {
            const matchedTable = tableJson.find(t =>
              t.id.toString() === tableQuery ||
              t.tableNo.toLowerCase() === tableQuery.toLowerCase() ||
              t.tableNo.toLowerCase() === `table ${tableQuery}`.toLowerCase()
            );
            if (matchedTable) {
              setSelectedTable(matchedTable.id.toString());
              initialTableSelected = true;
            }
          }
        }
        if (!initialTableSelected && tableJson.length > 0) {
          setSelectedTable(tableJson[0].id.toString());
        }
      }


      // Now fetch menu items (first batch)
      await fetchMenuItems('', 'All');

    } catch (error) {
      console.error("Failed to fetch POS parameters:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const shouldTrack = item.trackStock;
    if (shouldTrack && item.stockQty <= 0) {
      triggerToast(` "${item.name}" is out of stock! Set up stock quantity or turn off Stock Tracking.`, "error");
      return;
    }

    const existingCartItem = cart.find(cartItem => cartItem.menuItemId === item.id);

    if (existingCartItem) {
      if (shouldTrack && existingCartItem.qty >= item.stockQty) {
        triggerToast(` Cannot exceed available stock limit of ${item.stockQty} items.`, "error");
        return;
      }
      setCart(cart.map(cartItem => 
        cartItem.menuItemId === item.id 
          ? { ...cartItem, qty: cartItem.qty + 1 }
          : cartItem
      ));
      triggerToast(`Added one more "${item.name}" to cart.`, "success");
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        maxStock: item.stockQty,
        trackStock: item.trackStock,
        note: ""
      }]);
      triggerToast(`"${item.name}" added to cart.`, "success");
    }
  };

  // Cart Qty Modifiers
  const updateQty = (itemId, amount) => {
    const cartItem = cart.find(item => item.menuItemId === itemId);
    if (!cartItem) return;

    const newQty = cartItem.qty + amount;
    if (newQty <= 0) {
      removeFromCart(itemId);
    } else {
      const shouldTrack = cartItem.trackStock;
      if (shouldTrack && newQty > cartItem.maxStock) {
        triggerToast(` Cannot exceed available stock limit of ${cartItem.maxStock} items.`, "error");
        return;
      }
      setCart(cart.map(item => 
        item.menuItemId === itemId 
          ? { ...item, qty: newQty }
          : item
      ));
    }
  };

  const updateItemNote = (itemId, note) => {
    setCart(cart.map(item => 
      item.menuItemId === itemId 
        ? { ...item, note: note }
        : item
    ));
  };

  const removeFromCart = (itemId) => {
    const item = cart.find(i => i.menuItemId === itemId);
    setCart(cart.filter(item => item.menuItemId !== itemId));
    if (item) {
      triggerToast(`Removed "${item.name}" from cart.`, "info");
    }
  };

  // Unlock Discount Box via PIN Check
  const handleVerifyManagerPin = (e) => {
    e.preventDefault();
    setPinError("");

    if (managerPin === "0000" || managerPin === "1234") {
      setIsDiscountUnlocked(true);
      setShowPinModal(false);
      setManagerPin("");
      triggerToast(" Manager override success! Special discount unlocked.", "success");
    } else {
      setPinError("Invalid Manager PIN. Access Denied.");
      triggerToast(" Override failed. Invalid PIN.", "error");
    }
  };

  // Cart Subtotals
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const grandTotal = Math.max(0, cartSubtotal - discountAmount);

  // Place Order / Send KOT / Checkout
  const handleCheckout = async (paymentStatus, paymentMethod) => {
    if (!cart.length) {
      triggerToast(" Cart is empty! Add some delicious dishes first.", "error");
      return;
    }
    
    if (orderType === "dine_in" && !selectedTable) {
      triggerToast(" Please select a dining table before taking the order!", "error");
      return;
    }
    
    setCheckoutLoading(true);
    const token = localStorage.getItem("authToken");

    const orderPayload = {
      orderType: orderType,
      tableId: orderType === "dine_in" ? parseInt(selectedTable) : null,
      items: cart.map(item => ({
        menuItemId: item.menuItemId,
        qty: item.qty,
        note: item.note
      })),
      discount: discountAmount,
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod
    };

    try {
      const url = editingOrderId 
        ? `${BACKEND_URL}/api/orders/${editingOrderId}`
        : `${BACKEND_URL}/api/orders`;
      
      const method = editingOrderId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Order checkout failed.");
      }

      const oldEditingId = editingOrderId;
      setPrintedOrder(data.order);
      setCart([]);
      setDiscountAmount(0);
      setIsDiscountUnlocked(false);
      setEditingOrderId(null);
      
      if (paymentStatus === "paid") {
        setShowReceiptModal(true);
        triggerToast(
          oldEditingId
            ? ` Order #${oldEditingId} updated & settled successfully!`
            : " Order settled successfully! Invoice generated.",
          "success"
        );
      } else {
        triggerToast(
          oldEditingId
            ? ` KOT for Order #${oldEditingId} updated successfully!`
            : " KOT dispatched to kitchen! Waiting for payment...",
          "success"
        );
      }

      fetchPosData();

    } catch (error) {
      triggerToast(` Order Failed: ${error.message}`, "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Server already filters — just slice for lazy visible rendering
  const filteredMenuItems = menuItems;


  if (loading) {
    return (
      <LoadingScreen message="Syncing POS Cashier Engine..." minHeight="60vh" />
    );
  }

  const currentTableName = tables.find(t => t.id.toString() === selectedTable)?.tableNo || "None";

  return (
    <div className="space-y-6 text-slate-800 relative pb-10">
      
      {/* Dynamic Keyframes injected locally for perfect, HMR-safe animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          0% { transform: translateX(100%) scale(0.9); opacity: 0; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes scaleUp {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* ========================================================
          GLOBAL GLASSMORPHIC TOAST NOTIFICATION (REPLACES BROWSER ALERT)
          ======================================================== */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className={`border px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3.5 min-w-[290px] max-w-sm ${
            toast.type === "success" 
              ? "bg-emerald-600 border-emerald-700 text-white shadow-emerald-900/30" 
              : toast.type === "error" 
                ? "bg-rose-600 border-rose-700 text-white shadow-rose-900/30" 
                : "bg-slate-900 border-slate-700 text-slate-100"
          }`}>
            <span className="text-lg">
              {toast.type === "success" ? "" : toast.type === "error" ? "" : ""}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black tracking-wide leading-relaxed truncate">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(prev => ({ ...prev, show: false }))} 
              className="text-[9px] font-black opacity-60 hover:opacity-100 uppercase tracking-widest pl-2"
            >
              dismiss
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          FULL SCREEN BILL PROCESSING OVERLAY — BLOCKS ALL INTERACTION
          Light theme — stays until API fully completes, no duplicates
          ================================================================ */}
      {checkoutLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm select-none">

          {/* Spinner */}
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#ff5722] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#ff5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <h2 className="text-slate-900 font-black text-lg tracking-tight mb-1">Processing Bill</h2>
          <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest">
            Please wait...
          </p>

        </div>
      )}

      {/* Floating Cart Button when Sidebar is closed */}
      {!isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 bg-slate-900 text-white p-3 rounded-l-2xl shadow-2xl z-50 flex-col items-center gap-3 hover:bg-slate-800 transition-all duration-300 group hover:pr-4"
        >
          <span className="text-xl group-hover:scale-110 transition-transform"></span>
          <span className="[writing-mode:vertical-lr] rotate-180 text-[11px] font-black uppercase tracking-widest pt-2">
            Open Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})
          </span>
          <span className="group-hover:-translate-x-1 transition-transform mt-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          </span>
        </button>
      )}

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-slate-100 p-1.5 rounded-2xl gap-1 text-[11px] font-black text-slate-500 mb-6 shadow-inner animate-fade-in">
        <button
          type="button"
          onClick={() => setActiveMobileTab("menu")}
          className={`flex-1 py-3 rounded-xl transition duration-300 flex items-center justify-center gap-2 ${activeMobileTab === "menu" ? 'bg-slate-900 text-white shadow-md' : 'hover:text-slate-800'}`}
        >
          Menu Grid ({filteredMenuItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab("cart")}
          className={`flex-1 py-3 rounded-xl transition duration-300 flex items-center justify-center gap-2 relative ${activeMobileTab === "cart" ? 'bg-slate-900 text-white shadow-md' : 'hover:text-slate-800'}`}
        >
          Cart & Dining ({cart.reduce((sum, item) => sum + item.qty, 0)})
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff5722] text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-md">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          )}
        </button>
      </div>

      {/* POS GRID */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
        
        {/* ========================================================
            LEFT SIDE PANEL: CATEGORIES & FOOD MENU CARD GRID 
            ======================================================== */}
        <div className={`${isCartOpen ? 'lg:w-7/12' : 'w-full'} flex-1 space-y-6 ${activeMobileTab === "menu" ? "block" : "hidden lg:block"} transition-all duration-300 ease-in-out`}>
          
          {/* Search and Fast Order Type Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (filteredMenuItems.length === 1) {
                  addToCart(filteredMenuItems[0]);
                  setSearchQuery("");
                  triggerToast(`Added ${filteredMenuItems[0].name} to cart`, "success");
                } else if (filteredMenuItems.length > 1) {
                  triggerToast("Multiple items match query. Type more to narrow down!", "warning");
                } else {
                  triggerToast("No matching items found to add.", "error");
                }
              }}
              className="relative flex-1"
            >
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Search dishes... (Press Enter to auto-add if 1 match)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="premium-input w-full pl-11 pr-10 text-sm bg-white/80 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-650 text-xs font-black"
                >
                  
                </button>
              )}
            </form>
            
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 text-[10px] font-black text-slate-500 shadow-inner">
              <button
                onClick={() => { setOrderType("dine_in"); triggerToast("Switched to Dine-In mode", "info"); }}
                className={`px-4.5 py-2.5 rounded-xl transition-all duration-300 ${orderType === "dine_in" ? 'bg-slate-900 text-white shadow-md' : 'hover:text-slate-800'}`}
              >
                Dine-In
              </button>
              <button
                onClick={() => { setOrderType("takeaway"); triggerToast("Switched to Takeaway mode", "info"); }}
                className={`px-4.5 py-2.5 rounded-xl transition-all duration-300 ${orderType === "takeaway" ? 'bg-slate-900 text-white shadow-md' : 'hover:text-slate-800'}`}
              >
                Takeaway
              </button>
              <button
                onClick={() => { setOrderType("delivery"); triggerToast("Switched to Delivery mode", "info"); }}
                className={`px-4.5 py-2.5 rounded-xl transition-all duration-300 ${orderType === "delivery" ? 'bg-slate-900 text-white shadow-md' : 'hover:text-slate-800'}`}
              >
                Delivery
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full">
            {/* Horizontal pills for quick select */}
            <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-200 flex-1">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-wide border whitespace-nowrap transition duration-300 hover:shadow-sm ${selectedCategory === "All" ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-600'}`}
              >
                All Categories
              </button>
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-wide border whitespace-nowrap transition duration-300 hover:shadow-sm ${selectedCategory === cat.name ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-600'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Menu Grid */}
          {menuLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-4 border-slate-900 border-t-transparent animate-spin mx-auto" />
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Loading dishes...</p>
              </div>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl p-16 text-center rounded-[2.5rem] space-y-3 border border-slate-100 shadow-xl shadow-slate-100/10">
              <svg className="w-12 h-12 text-slate-350 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <h3 className="font-black text-slate-900 text-base">No Dishes Found</h3>
              <p className="text-slate-400 text-xs font-semibold max-w-xs mx-auto">Try a different search term or category.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Render Paginated Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredMenuItems.slice(0, visibleCount).map((item) => {
                  const isOutOfStock = item.trackStock && item.stockQty <= 0;
                  const isLowStock = item.trackStock && item.stockQty > 0 && item.stockQty <= 10;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      disabled={isOutOfStock}
                      className={`bg-white/80 backdrop-blur-md border p-5 rounded-[2rem] flex flex-col justify-between gap-4 text-left shadow-lg shadow-slate-100/30 relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 group active:scale-[0.98] ${isOutOfStock ? 'opacity-40 cursor-not-allowed border-rose-100 bg-rose-50/5 shadow-none' : 'border-slate-200/80'}`}
                    >
                      <div className="space-y-1.5 w-full">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.category?.name}</span>
                          
                          {/* Dynamic Stock Indicator Badge */}
                          {!item.trackStock ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[8px] text-emerald-600 font-black uppercase tracking-wider">
                              Ready
                            </span>
                          ) : isOutOfStock ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-100 text-[8px] text-rose-600 font-black uppercase tracking-wider">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-100 text-[8px] text-amber-600 font-black uppercase tracking-wider">Low: {item.stockQty}</span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-[8px] text-slate-700 font-black uppercase tracking-wider">Stock: {item.stockQty}</span>
                          )}
                        </div>
                        <h4 className="font-black text-slate-900 text-sm leading-snug line-clamp-2 pt-1 group-hover:text-slate-950">{highlightText(item.name, searchQuery)}</h4>
                      </div>
                      
                      <div className="flex justify-between items-center w-full border-t border-slate-100 pt-3.5 mt-1">
                        <span className="text-base font-black text-slate-950">₹{item.price.toFixed(2)}</span>
                        <span className="w-8.5 h-8.5 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base transition-all duration-300 group-hover:scale-105 active:scale-95 shadow-md shadow-slate-950/10">
                          +
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Elegant Load More Button */}
              {filteredMenuItems.length > visibleCount && (
                <div className="flex flex-col items-center justify-center pt-2 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Showing {Math.min(visibleCount, filteredMenuItems.length)} of {menuMeta.total || filteredMenuItems.length} Dishes
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleCount(prev => prev + 24);
                    }}
                    className="px-8 py-3.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-800 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-md hover:shadow-lg transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-2"
                  >
                    <span></span> Load More Dishes
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================
            RIGHT SIDE PANEL: CASHIER BILLING CART & CHECKOUT
            ======================================================== */}
        <div className={`${isCartOpen ? 'lg:w-5/12 lg:min-w-[340px]' : 'hidden'} space-y-6 ${activeMobileTab === "cart" ? "block" : "hidden lg:block"} transition-all duration-300 ease-in-out animate-fade-in`}>
          
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xl shadow-slate-100/40 space-y-6 flex flex-col justify-between min-h-[78vh] relative">
            
            <div className="space-y-5">
              
              {/* Cart Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
                    <span></span> Order Cart
                  </h3>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="hidden lg:flex w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 items-center justify-center transition-colors shadow-inner border border-slate-200/50 cursor-pointer"
                    title="Hide Cart Sidebar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 shadow-inner">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} Items Selected
                </span>
              </div>

              {/* Editing Mode Banner alert */}
              {editingOrderId && (
                <div className="bg-indigo-50 border border-indigo-150 p-3 rounded-2xl flex items-center justify-between gap-3 text-indigo-700 animate-pulse mt-3">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block mr-1"></span> Edit Mode Active
                    </p>
                    <p className="text-[9px] font-bold text-indigo-500 mt-0.5">Modifying Order #{editingOrderId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOrderId(null);
                      setCart([]);
                      setDiscountAmount(0);
                      setIsDiscountUnlocked(false);
                      triggerToast("Exited order editing mode safely.", "info");
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-600 text-indigo-600 font-extrabold text-[9px] uppercase tracking-wider rounded-lg border border-indigo-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* VISUAL DINING TABLES MAP (Mandatory Table Selection) */}
              {orderType === "dine_in" && (
                <div className="space-y-3 bg-slate-50/50 border border-slate-100 p-4.5 rounded-[2rem] shadow-inner">
                  
                  {/* Title and Active indicator */}
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      Dining Tables
                    </label>
                    <span className="text-[10px] font-black text-[#ff5722] bg-orange-50 px-3 py-1 rounded-lg border border-orange-100/50 animate-fade-in">
                      Active: {currentTableName}
                    </span>
                  </div>

                  {/* 1. Floor Zones Scrolling Pills (Premium styling) */}
                  {tables.length > 5 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100/60 pb-2">
                      {["All", "Ground Floor", "First Floor", "Rooftop Garden", "VIP Section"].map((zone) => {
                        // Only show zone if at least one table belongs to it or it's "All"
                        const hasTables = zone === "All" || tables.some(t => {
                          const clean = t.tableNo.toUpperCase();
                          if (zone === "VIP Section") return clean.includes("VIP");
                          const num = parseInt(clean.replace(/\D/g, ""), 10);
                          if (!isNaN(num)) {
                            if (zone === "Ground Floor") return num <= 5 && !clean.includes("VIP");
                            if (zone === "First Floor") return num > 5 && num <= 10 && !clean.includes("VIP");
                            if (zone === "Rooftop Garden") return num > 10 && !clean.includes("VIP");
                          }
                          return zone === "General Hall";
                        });

                        if (!hasTables) return null;

                        const isSelected = selectedZone === zone;
                        return (
                          <button
                            key={zone}
                            type="button"
                            onClick={() => {
                              setSelectedZone(zone);
                              triggerToast(`Filtered: ${zone}`, "info");
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black whitespace-nowrap border transition duration-300 ${
                              isSelected 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                                : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {zone === "All" ? "All Floors" : zone}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Fast Table Search bar & Status Filters */}
                  <div className="flex gap-2 items-center">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[10px] text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Search Table..."
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-bold bg-white text-slate-700 placeholder:text-slate-350 focus:border-[#ff5722] focus:outline-none transition shadow-sm"
                      />
                    </div>

                    {/* Status Counters Selector */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl shadow-inner shrink-0 text-[8.5px] font-black text-slate-505 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setSelectedStatus("All")}
                        className={`px-2 py-1 rounded-lg transition ${selectedStatus === "All" ? 'bg-white text-slate-800 shadow-sm' : 'hover:text-slate-700'}`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStatus("free")}
                        className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${selectedStatus === "free" ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-emerald-500'}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-0.5"></span> {tables.filter(t => t.status === "free").length}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStatus("busy")}
                        className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${selectedStatus === "busy" ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-rose-505'}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block mr-0.5"></span> {tables.filter(t => t.status === "busy").length}
                      </button>
                    </div>
                  </div>

                  {/* Scrollable grid area with dynamic height */}
                  <div className="max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                    <div className="grid grid-cols-3 gap-2">
                      {tables
                        .filter(table => {
                          // 1. Search Query Filter
                          if (tableSearchQuery && !table.tableNo.toLowerCase().includes(tableSearchQuery.toLowerCase())) {
                            return false;
                          }
                          
                          // 2. Occupancy Status Filter
                          if (selectedStatus !== "All" && table.status !== selectedStatus) {
                            return false;
                          }

                          // 3. Zone Floor Filter
                          if (selectedZone !== "All") {
                            const clean = table.tableNo.toUpperCase();
                            if (selectedZone === "VIP Section") return clean.includes("VIP");
                            const num = parseInt(clean.replace(/\D/g, ""), 10);
                            if (!isNaN(num)) {
                              if (selectedZone === "Ground Floor") return num <= 5 && !clean.includes("VIP");
                              if (selectedZone === "First Floor") return num > 5 && num <= 10 && !clean.includes("VIP");
                              if (selectedZone === "Rooftop Garden") return num > 10 && !clean.includes("VIP");
                            }
                            return selectedZone === "General Hall";
                          }

                          return true;
                        })
                        .map((table) => {
                          const isSelected = selectedTable === table.id.toString();
                          return (
                            <button
                              key={table.id}
                              type="button"
                              onClick={() => {
                                setSelectedTable(table.id.toString());
                                triggerToast(`Selected ${table.tableNo}`, "info");
                              }}
                              className={`py-3 px-2 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1 active:scale-95 ${
                                isSelected 
                                  ? 'bg-gradient-to-br from-[#ff5722] to-[#ff7a47] border-transparent text-white shadow-lg shadow-orange-500/25 scale-[1.03] font-black' 
                                  : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700 hover:border-slate-200'
                              }`}
                            >
                              <span className="text-xs">{table.tableNo}</span>
                              <span className={`text-[8.5px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider ${
                                isSelected 
                                  ? 'bg-white/30 text-white' 
                                  : table.status === 'busy' 
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100/50' 
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                              }`}>
                                {table.status}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Cart items list scrolling view */}
            <div className="flex-1 overflow-y-auto min-h-[30vh] max-h-[40vh] space-y-3.5 my-4 pr-1 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 lg:p-12 space-y-2.5 opacity-55">
                  <svg className="w-16 h-16 text-slate-350 mx-auto animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  <p className="text-base font-black text-slate-500">Cart is empty</p>
                  <p className="text-xs text-slate-400 font-semibold max-w-[180px] mx-auto">Click items on the left to add to order.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.menuItemId} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-3 relative shadow-sm hover:border-slate-200 transition duration-300">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate leading-snug">{item.name}</p>
                        <p className="text-[10px] font-black text-slate-500 mt-1">₹{(item.price * item.qty).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.menuItemId)}
                        className="text-slate-300 hover:text-rose-500 font-bold text-sm transition px-1"
                      >
                        
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 pt-1">
                      {/* Note Input */}
                      <input
                        type="text"
                        placeholder="Add Chef Note (e.g. Less spicy, Sweet...)"
                        value={item.note}
                        onChange={(e) => updateItemNote(item.menuItemId, e.target.value)}
                        className="text-[10px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-600 focus:border-slate-800 focus:outline-none flex-1 placeholder:text-slate-300 font-bold"
                      />
                      
                      {/* Qty Modifiers */}
                      <div className="flex items-center gap-1.5 border border-slate-250 bg-white rounded-xl p-1 shadow-sm">
                        <button
                          onClick={() => updateQty(item.menuItemId, -1)}
                          className="w-5.5 h-5.5 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs active:scale-95"
                        >
                          -
                        </button>
                        <span className="text-[10px] font-black px-1 text-slate-800">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.menuItemId, 1)}
                          className="w-5.5 h-5.5 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations Panel */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>

              {/* Discount Selector */}
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500 flex items-center gap-1.5">
                  Discount
                  <button
                    onClick={() => { if (!isDiscountUnlocked) setShowPinModal(true); }}
                    className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider transition ${isDiscountUnlocked ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}
                  >
                    {isDiscountUnlocked ? " Override Enabled" : " PIN Required"}
                  </button>
                </span>
                
                {isDiscountUnlocked ? (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">₹</span>
                    <input
                      type="number"
                      max={cartSubtotal}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.min(cartSubtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-20 text-right bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800 text-xs focus:border-slate-850 font-black"
                    />
                  </div>
                ) : (
                  <span className="text-slate-400">₹0.00</span>
                )}
              </div>



              <div className="flex justify-between text-base font-black text-slate-900 border-t border-dashed border-slate-200 pt-3">
                <span>Total Payable</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>

            </div>

            {/* POS Billing Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => handleCheckout("unpaid", null)}
                disabled={checkoutLoading || !cart.length}
                className="py-4 bg-[#1e293b] hover:bg-[#0f172a] text-white font-extrabold rounded-2xl text-[10px] tracking-widest uppercase transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 active:scale-95"
              >
                {checkoutLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    <span>Sending KOT...</span>
                  </>
                ) : (
                  "Send KOT to Chef"
                )}
              </button>
              <button
                onClick={() => handleCheckout("paid", "cash")}
                disabled={checkoutLoading || !cart.length}
                className="py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold rounded-2xl text-[10px] tracking-widest uppercase transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
              >
                {checkoutLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    <span>Creating Bill...</span>
                  </>
                ) : (
                  "Cash & Settle Bill"
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================
          MODAL A: SECURITY MANAGER PIN overrides
          ======================================================== */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6.5 rounded-[2.5rem] w-full max-w-sm space-y-4 shadow-2xl animate-scale-up">
            <div className="text-center space-y-1.5">
              <span className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mx-auto mb-1 font-bold border border-rose-100">PIN</span>
              <h4 className="font-black text-slate-900 text-lg">Manager Override</h4>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Enter your 4-digit manager authorization code to unlock discounts.</p>
            </div>
            
            {pinError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-center text-xs text-rose-600 font-bold">
                 {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyManagerPin} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                placeholder="• • • •"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
                className="w-full tracking-[16px] text-center text-2xl font-black py-3.5 border border-slate-200 rounded-2xl focus:border-slate-900 bg-slate-50 text-slate-950"
                required
              />
              <p className="text-[10px] text-slate-400 text-center font-bold">Sandbox Override PIN: **0000**</p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowPinModal(false); setPinError(""); setManagerPin(""); }}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-2xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs transition"
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KOT Modal removed — toast notification handles KOT confirmation */}

      {/* ========================================================
          MODAL C: HIGH-FIDELITY POS THERMAL INVOICE RECEIPT PREVIEW (CUSTOM BILL)
          ======================================================== */}
      {showReceiptModal && printedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-100 border border-slate-300 p-6.5 rounded-[2.5rem] w-full max-w-sm space-y-6 shadow-2xl relative text-slate-900 animate-scale-up">
            
            {/* Glow Banner */}
            <div className="text-center space-y-1">
              <span className="inline-flex items-center justify-center w-8.5 h-8.5 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-600 font-extrabold text-sm mb-1"></span>
              <h4 className="font-black text-lg">Transaction Settled</h4>
              <p className="text-slate-500 text-[10px] font-semibold">Payment of ₹{printedOrder.total.toFixed(2)} received in Cash.</p>
            </div>

            {/* Thermal Print paper */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl text-slate-850 font-mono text-[11px] leading-relaxed select-none relative overflow-hidden">
              {/* Paper Zigzag Top */}
              <div className="absolute top-0 inset-x-0 h-1 bg-[radial-gradient(circle_at_5px_0,_transparent_4px,_#e2e8f0_4px)] bg-[length:10px_4px]" />
              
              <div className="text-center border-b border-dashed border-slate-200 pb-3 mb-3.5 mt-1.5">
                <p className="font-bold text-sm tracking-wide text-slate-950">RESTUVEXO CAFE & DINER</p>
                <p className="text-[9px] text-slate-400">cPanel Live operating terminal</p>
                <p className="text-[9px] text-slate-400 font-bold">HSR Layout, Bengaluru, India</p>
              </div>

              <div className="space-y-1 border-b border-dashed border-slate-200 pb-3 mb-3.5 text-slate-500 text-[9px] font-bold">
                <p>Order No: #RESTUVEXO-{printedOrder.id}</p>
                <p>Date: {new Date(printedOrder.createdAt).toLocaleString()}</p>
                <p>Waiter: {printedOrder.creator?.name || "Cashier"} ({printedOrder.creator?.role || "Staff"})</p>
                <p>Type: {printedOrder.orderType.toUpperCase()} {printedOrder.table && `[${printedOrder.table.tableNo.toLowerCase().startsWith('table') ? printedOrder.table.tableNo : `Table ${printedOrder.table.tableNo}`}]`}</p>
              </div>

              {/* Items */}
              <div className="space-y-2 border-b border-dashed border-slate-200 pb-3.5 mb-3.5">
                <div className="flex justify-between font-bold text-slate-950 text-[10px] pb-1.5 border-b border-slate-100">
                  <span>Item Description</span>
                  <span className="w-12 text-center">Qty</span>
                  <span className="w-16 text-right">Price</span>
                </div>
                
                {printedOrder.orderItems.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-slate-700">
                      <span className="truncate max-w-[120px] font-bold">{item.menuItem?.name}</span>
                      <span className="w-12 text-center font-bold">x{item.qty}</span>
                      <span className="w-16 text-right">₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                    {item.note && (
                      <p className="text-[9px] text-rose-500 font-bold italic ml-2">Note: {item.note}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="space-y-1.5 text-right font-bold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-normal">Subtotal</span>
                  <span>₹{printedOrder.subtotal.toFixed(2)}</span>
                </div>
                {printedOrder.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span className="font-normal">PIN Override Discount</span>
                    <span>-₹{printedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                 {printedOrder.tax && parseFloat(printedOrder.tax) > 0 && (
                   <div className="flex justify-between">
                     <span className="text-slate-400 font-normal">GST Tax (5%)</span>
                     <span>₹{parseFloat(printedOrder.tax).toFixed(2)}</span>
                   </div>
                 )}
                <div className="flex justify-between text-slate-950 text-xs border-t border-slate-150 pt-1.5 font-black">
                  <span>Grand Total</span>
                  <span>₹{printedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center border-t border-dashed border-slate-200 pt-3 mt-3 text-slate-400 text-[9px] font-bold">
                <p className="font-bold uppercase tracking-wider text-slate-900">Thank you for dining!</p>
                <p>Powered by RESTUVEXO SaaS Operating System</p>
              </div>

              {/* Paper Zigzag Bottom Accent */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-[radial-gradient(circle_at_5px_4px,_transparent_4px,_#e2e8f0_4px)] bg-[length:10px_4px]" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReceiptModal(false); setPrintedOrder(null); }}
                className="flex-1 py-3.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold rounded-2xl text-xs transition shadow-sm active:scale-95"
              >
                Close Window
              </button>
              <button
                onClick={() => { 
                  triggerToast("POS Thermal Print payload dispatched to customer printer successfully!", "success");
                }}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs transition shadow-md active:scale-95"
              >
                Print Invoice (ESC)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
