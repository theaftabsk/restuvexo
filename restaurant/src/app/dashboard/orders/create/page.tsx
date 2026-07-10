"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Search, ShoppingCart, User, Phone, X,
  ChevronLeft, ChevronRight, UtensilsCrossed,
  ArrowLeft, MapPin, Clock, Flame, Trash2, Send,
  ChefHat, Circle, Hash
} from "lucide-react";

export default function OrderCreate() {
  const [user, setUser] = useState<any>(null);

  // Menu data
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  // Selection/filter state
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [orderType, setOrderType] = useState("dine_in");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Mobile cart drawer
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Custom Toast state
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const triggerToast = (message: string, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    
    fetchPosData();

    // Restore edit session if editing active order
    const savedEditOrderId = localStorage.getItem("editOrderId");
    if (savedEditOrderId) {
      setEditingOrderId(savedEditOrderId);
      
      const savedTable = localStorage.getItem("editOrderTable");
      if (savedTable) setSelectedTable(savedTable);

      const savedType = localStorage.getItem("editOrderType");
      if (savedType) setOrderType(savedType);

      const savedItems = localStorage.getItem("editOrderItems");
      if (savedItems) {
        try {
          const parsedItems = JSON.parse(savedItems);
          const cartItems = parsedItems.map((item: any) => ({
            menuItemId: item.menuItemId,
            name: item.menuItem?.name || item.name,
            price: parseFloat(item.price || item.menuItem?.price || 0),
            qty: item.qty,
            maxStock: item.menuItem?.stockQty || 999,
            trackStock: item.menuItem?.trackStock ?? true,
            note: item.note || ""
          }));
          setCart(cartItems);
        } catch (err) {
          console.error("Failed to restore order items:", err);
        }
      }
      
      localStorage.removeItem("editOrderId");
      localStorage.removeItem("editOrderTable");
      localStorage.removeItem("editOrderItems");
      localStorage.removeItem("editOrderType");
      localStorage.removeItem("editOrderDiscount");
    }
  }, []);

  const fetchMenuItems = useCallback(async (search: string, category: string) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (search) params.set('search', search);
      if (category && category !== 'All') params.set('category', category);
      const res = await fetch(`${BACKEND_URL}/api/menu/menu-items?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setMenuItems(json.data || []);
      }
    } catch (e) {
      console.error("Menu fetch failed:", e);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchMenuItems(searchQuery, selectedCategory);
  }, [selectedCategory, searchQuery]);

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

      const [catJson, tableJson] = await Promise.all([
        catRes.ok ? catRes.json() : [],
        fetch(`${BACKEND_URL}/api/tables`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : [])
      ]);

      if (Array.isArray(catJson)) setCategories(catJson);
      if (Array.isArray(tableJson)) {
        setTables(tableJson);
        if (tableJson.length > 0) {
          setSelectedTable(tableJson[0].id.toString());
        }
      }

      await fetchMenuItems('', 'All');

    } catch (error) {
      console.error("Failed to fetch POS parameters:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cart state helper
  const [cart, setCart] = useState<any[]>([]);

  const getCartQty = (itemId: number) => {
    const item = cart.find(i => i.menuItemId === itemId);
    return item ? item.qty : 0;
  };

  const updateQty = (itemId: number, amount: number) => {
    const cartItem = cart.find(item => item.menuItemId === itemId);
    if (!cartItem) return;

    const newQty = cartItem.qty + amount;
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.menuItemId !== itemId));
      triggerToast(`Removed "${cartItem.name}" from cart.`, "info");
      return;
    }

    const shouldTrack = cartItem.trackStock;
    if (shouldTrack && newQty > cartItem.maxStock) {
      triggerToast(`Cannot exceed stock limit of ${cartItem.maxStock} items.`, "error");
      return;
    }

    setCart(prev => prev.map(item => 
      item.menuItemId === itemId 
        ? { ...item, qty: newQty }
        : item
    ));
  };

  const adjustCartQty = (item: any, delta: number) => {
    const currentQty = getCartQty(item.id);
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.menuItemId !== item.id));
      triggerToast(`Removed "${item.name}" from cart.`, "info");
      return;
    }

    const shouldTrack = item.trackStock;
    if (shouldTrack && newQty > item.stockQty) {
      triggerToast(`Cannot exceed stock limit of ${item.stockQty} items.`, "error");
      return;
    }

    if (currentQty > 0) {
      setCart(prev => prev.map(i => i.menuItemId === item.id ? { ...i, qty: newQty } : i));
    } else {
      setCart(prev => [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        qty: 1,
        maxStock: item.stockQty,
        trackStock: item.trackStock,
        note: ""
      }]);
      triggerToast(`"${item.name}" added to cart.`, "success");
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleDispatchOrder = async () => {
    if (!cart.length) {
      triggerToast("Cart is empty! Add some items first.", "error");
      return;
    }
    
    if (orderType === "dine_in" && !selectedTable) {
      triggerToast("Please select a dining table!", "error");
      return;
    }
    
    setCheckoutLoading(true);
    const token = localStorage.getItem("authToken");

    const orderPayload = {
      orderType: orderType,
      tableId: orderType === "dine_in" ? parseInt(selectedTable) : null,
      customerName: customerName || null,
      customerMobile: customerMobile || null,
      items: cart.map(item => ({
        menuItemId: item.menuItemId,
        qty: item.qty,
        note: item.note
      })),
      discount: 0,
      paymentStatus: "unpaid"
    };

    try {
      const url = editingOrderId 
        ? `${BACKEND_URL}/api/order/${editingOrderId}`
        : `${BACKEND_URL}/api/order`;
      
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
        throw new Error(data.error || "Order dispatch failed.");
      }

      setCart([]);
      setCustomerName("");
      setCustomerMobile("");
      setEditingOrderId(null);
      setSearchQuery("");
      setSelectedCategory("All");
      setMobileCartOpen(false);
      
      triggerToast(
        editingOrderId
          ? ` KOT for Order #${editingOrderId} updated successfully!`
          : " KOT dispatched to kitchen!",
        "success"
      );

      // Reload active table status and menu item quantities instantly
      fetchPosData();

    } catch (error: any) {
      triggerToast(`Order Dispatch Failed: ${error.message}`, "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const selectedTableObj = tables.find(t => t.id.toString() === selectedTable);

  if (loading) {
    return <LoadingScreen message="Syncing Captain Panel..." minHeight="100vh" />;
  }

  return (
    <div className="order-create-root">

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .order-create-root {
          --accent: #ff5722;
          --accent-hover: #e64a19;
          --accent-light: #fff3e0;
          --accent-glow: rgba(255, 87, 34, 0.15);
          --bg: #f8fafc;
          --surface: #ffffff;
          --surface-2: #f1f5f9;
          --border: #e2e8f0;
          --border-light: #f1f5f9;
          --text: #0f172a;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --success: #10b981;
          --danger: #ef4444;

          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* ========= ANIMATIONS ========= */
        @keyframes slideUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { 0% { transform: translateX(100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes scaleIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes cartBounce { 0% { transform: scale(1); } 30% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes slideDrawerUp { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
        @keyframes fadeOverlay { 0% { opacity: 0; } 100% { opacity: 1; } }

        .anim-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slide-right { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-fade { animation: fadeIn 0.3s ease forwards; }
        .anim-scale { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-bounce { animation: cartBounce 0.3s ease; }

        /* ========= SCROLLBAR ========= */
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* ========= LAYOUT ========= */
        .main-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        /* --- TOP BAR --- */
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          gap: 12px;
          z-index: 20;
        }
        .top-bar-left { display: flex; align-items: center; gap: 10px; }
        .back-btn {
          width: 36px; height: 36px;
          border-radius: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .back-btn:hover { background: var(--border); color: var(--text); }
        .top-bar-title h1 {
          font-size: 16px; font-weight: 800;
          letter-spacing: -0.3px; color: var(--text);
          line-height: 1.2;
        }
        .top-bar-title p {
          font-size: 10px; color: var(--text-muted);
          font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.8px; margin-top: 1px;
        }
        .top-bar-right { display: flex; align-items: center; gap: 8px; }

        /* --- TABLE SELECTOR (Premium Dropdown) --- */
        .table-selector {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 10px;
          background: var(--surface-2);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 0;
        }
        .table-selector:hover { border-color: var(--accent); background: var(--accent-light); }
        .table-selector .table-icon {
          width: 28px; height: 28px;
          border-radius: 10px;
          background: var(--accent);
          display: flex; align-items: center; justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .table-selector .table-info {
          display: flex; flex-direction: column;
          min-width: 0;
        }
        .table-selector .table-label {
          font-size: 9px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.6px;
          color: var(--text-muted);
          line-height: 1;
        }
        .table-selector .table-name {
          font-size: 13px; font-weight: 800;
          color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.3;
        }

        .table-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06);
          z-index: 100;
          min-width: 260px;
          max-height: 320px;
          overflow-y: auto;
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          padding: 6px;
        }
        .table-dropdown-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .table-dropdown-item:hover { background: var(--surface-2); }
        .table-dropdown-item.active { background: var(--accent-light); }
        .table-dropdown-item .td-icon {
          width: 36px; height: 36px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 900;
          flex-shrink: 0;
        }
        .td-available { background: #ecfdf5; color: #059669; }
        .td-occupied { background: #fef2f2; color: #dc2626; }
        .td-reserved { background: #fefce8; color: #ca8a04; }
        .table-dropdown-item .td-info { flex: 1; min-width: 0; }
        .table-dropdown-item .td-name { font-size: 13px; font-weight: 800; color: var(--text); }
        .table-dropdown-item .td-status {
          font-size: 9px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .td-status-available { color: #059669; }
        .td-status-occupied { color: #dc2626; }
        .td-status-reserved { color: #ca8a04; }
        .table-dropdown-item .td-check {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: var(--accent);
          color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 900;
        }

        /* --- SEARCH BAR --- */
        .search-section {
          padding: 12px 16px 8px;
          flex-shrink: 0;
        }
        .search-wrap {
          position: relative;
        }
        .search-wrap svg {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          width: 18px; height: 18px;
          color: var(--text-muted);
        }
        .search-wrap input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          font-size: 14px; font-weight: 600;
          color: var(--text);
          outline: none;
          transition: all 0.2s;
        }
        .search-wrap input::placeholder { color: var(--text-muted); font-weight: 500; }
        .search-wrap input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        /* --- CATEGORY CHIPS --- */
        .category-section {
          padding: 4px 16px 8px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cat-scroll-btn {
          width: 30px; height: 30px;
          border-radius: 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .cat-scroll-btn:hover { background: var(--surface-2); color: var(--text); }
        .cat-track {
          flex: 1;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0;
        }
        .cat-chip {
          padding: 8px 18px;
          border-radius: 100px;
          font-size: 11px; font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
          border: 1.5px solid transparent;
          flex-shrink: 0;
        }
        .cat-chip.active {
          background: var(--text);
          color: white;
          border-color: var(--text);
        }
        .cat-chip:not(.active) {
          background: var(--surface);
          color: var(--text-secondary);
          border-color: var(--border);
        }
        .cat-chip:not(.active):hover {
          background: var(--surface-2);
          border-color: var(--text-muted);
        }

        /* --- MENU GRID --- */
        .menu-grid-area {
          flex: 1;
          overflow-y: auto;
          padding: 4px 16px 100px;
        }
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }

        .menu-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 20px;
          padding: 16px 14px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.25s;
          position: relative;
        }
        .menu-card:hover {
          border-color: var(--accent);
          box-shadow: 0 8px 24px var(--accent-glow);
          transform: translateY(-2px);
        }
        .menu-card.in-cart {
          border-color: var(--accent);
          background: var(--accent-light);
        }
        .menu-card .mc-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 16px;
          background: var(--surface-2);
          border: 1px solid var(--border-light);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s;
        }
        .menu-card:hover .mc-icon-wrap,
        .menu-card.in-cart .mc-icon-wrap {
          background: var(--accent-light);
          border-color: rgba(255,87,34,0.15);
        }
        .mc-icon-wrap svg {
          width: 22px; height: 22px;
          color: var(--text-muted);
          transition: color 0.25s;
        }
        .menu-card:hover .mc-icon-wrap svg,
        .menu-card.in-cart .mc-icon-wrap svg { color: var(--accent); }
        .mc-name {
          font-size: 12px; font-weight: 800;
          color: var(--text);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .mc-cat {
          font-size: 9px; font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .mc-price {
          font-size: 15px; font-weight: 900;
          color: var(--accent);
          letter-spacing: -0.3px;
        }

        /* Quantity Control on Card */
        .mc-qty-control {
          display: flex;
          align-items: center;
          gap: 0;
          border-radius: 12px;
          overflow: hidden;
          margin-top: 2px;
        }
        .mc-add-btn {
          padding: 7px 20px;
          background: var(--text);
          color: white;
          font-size: 10px; font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mc-add-btn:hover { background: var(--accent); }
        .mc-add-btn:active { transform: scale(0.95); }
        .mc-qty-stepper {
          display: flex;
          align-items: center;
          background: var(--accent);
          border-radius: 12px;
          overflow: hidden;
        }
        .mc-qty-stepper button {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          color: white;
          font-size: 14px; font-weight: 900;
          cursor: pointer;
          background: transparent;
          border: none;
          transition: background 0.15s;
        }
        .mc-qty-stepper button:hover { background: rgba(255,255,255,0.15); }
        .mc-qty-stepper span {
          min-width: 24px; text-align: center;
          font-size: 13px; font-weight: 900;
          color: white;
        }

        /* --- DESKTOP RIGHT SIDEBAR --- */
        .right-sidebar {
          display: none;
        }

        /* --- MOBILE FLOATING CART BUTTON --- */
        .mobile-cart-fab {
          position: fixed;
          bottom: 20px; right: 20px;
          width: 60px; height: 60px;
          border-radius: 50%;
          background: var(--accent);
          color: white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 30px rgba(255,87,34,0.35);
          z-index: 50;
          cursor: pointer;
          border: none;
          transition: all 0.3s;
        }
        .mobile-cart-fab:hover { transform: scale(1.05); box-shadow: 0 12px 40px rgba(255,87,34,0.45); }
        .mobile-cart-fab:active { transform: scale(0.95); }
        .mobile-cart-fab .cart-badge {
          position: absolute;
          top: -4px; right: -4px;
          min-width: 22px; height: 22px;
          border-radius: 999px;
          background: var(--text);
          color: white;
          font-size: 11px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          padding: 0 6px;
          border: 2px solid var(--bg);
        }

        /* --- MOBILE CART DRAWER --- */
        .cart-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 90;
          animation: fadeOverlay 0.2s ease;
        }
        .cart-drawer {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          max-height: 85vh;
          background: var(--surface);
          border-radius: 24px 24px 0 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          animation: slideDrawerUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 -20px 60px rgba(0,0,0,0.15);
        }
        .drawer-handle {
          width: 36px; height: 4px;
          background: var(--border);
          border-radius: 999px;
          margin: 10px auto 0;
          flex-shrink: 0;
        }
        .drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 12px;
          border-bottom: 1px solid var(--border-light);
          flex-shrink: 0;
        }
        .drawer-header h3 {
          font-size: 16px; font-weight: 800;
          color: var(--text);
        }
        .drawer-header .item-count {
          font-size: 11px; font-weight: 700;
          color: var(--text-muted);
          background: var(--surface-2);
          padding: 4px 10px;
          border-radius: 999px;
        }
        .drawer-close {
          width: 32px; height: 32px;
          border-radius: 10px;
          background: var(--surface-2);
          border: none;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
        }

        /* --- CART ITEMS LIST --- */
        .cart-items-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px 20px;
        }
        .cart-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 40px 0;
          color: var(--text-muted);
        }
        .cart-empty svg { width: 40px; height: 40px; margin-bottom: 12px; opacity: 0.4; }
        .cart-empty p { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }

        .cart-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .cart-item:last-child { border-bottom: none; }
        .ci-info { flex: 1; min-width: 0; }
        .ci-name { font-size: 13px; font-weight: 800; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ci-price { font-size: 11px; font-weight: 700; color: var(--accent); margin-top: 2px; }
        .ci-total { font-size: 14px; font-weight: 900; color: var(--text); margin-right: 12px; white-space: nowrap; }
        .ci-stepper {
          display: flex; align-items: center;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--surface-2);
        }
        .ci-stepper button {
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 14px; font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ci-stepper button:hover { background: var(--border); color: var(--text); }
        .ci-stepper span {
          min-width: 20px; text-align: center;
          font-size: 13px; font-weight: 900;
          color: var(--text);
        }

        /* --- ORDER DETAILS FORM --- */
        .order-details-section {
          padding: 16px 20px;
          border-top: 1px solid var(--border-light);
          background: var(--surface-2);
        }
        .od-title {
          font-size: 10px; font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .od-row { margin-bottom: 10px; }
        .od-label {
          font-size: 10px; font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          display: block;
        }
        .od-input-wrap {
          position: relative;
        }
        .od-input-wrap svg {
          position: absolute;
          left: 12px; top: 50%;
          transform: translateY(-50%);
          width: 16px; height: 16px;
          color: var(--text-muted);
        }
        .od-input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          font-size: 13px; font-weight: 600;
          color: var(--text);
          outline: none;
          transition: border 0.2s;
        }
        .od-input:focus { border-color: var(--accent); }
        .od-input::placeholder { color: var(--text-muted); }
        .od-inputs-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        /* --- CHECKOUT FOOTER --- */
        .checkout-footer {
          padding: 16px 20px;
          background: var(--surface);
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
        .checkout-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .checkout-total-label {
          font-size: 12px; font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-secondary);
        }
        .checkout-total-amount {
          font-size: 24px; font-weight: 900;
          color: var(--text);
          letter-spacing: -0.5px;
        }
        .checkout-btn {
          width: 100%;
          padding: 14px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 13px; font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 24px rgba(255,87,34,0.25);
        }
        .checkout-btn:hover { background: var(--accent-hover); box-shadow: 0 12px 32px rgba(255,87,34,0.35); }
        .checkout-btn:active { transform: scale(0.98); }
        .checkout-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* --- FULLSCREEN LOADER --- */
        .dispatch-overlay {
          position: fixed; inset: 0;
          z-index: 9999;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(8px);
        }
        .dispatch-spinner {
          width: 48px; height: 48px;
          border: 4px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dispatch-text { font-size: 14px; font-weight: 800; color: var(--text); }

        /* --- TOAST --- */
        .toast-container {
          position: fixed;
          top: 16px; right: 16px;
          z-index: 200;
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .toast-box {
          background: var(--text);
          color: white;
          padding: 12px 18px;
          border-radius: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 340px;
        }
        .toast-msg { font-size: 12px; font-weight: 700; flex: 1; line-height: 1.4; }
        .toast-dismiss {
          font-size: 9px; font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.5;
          cursor: pointer;
          background: none; border: none;
          color: white;
          padding: 4px 8px;
          white-space: nowrap;
        }
        .toast-dismiss:hover { opacity: 1; }

        /* ========= DESKTOP RESPONSIVE ========= */
        @media (min-width: 768px) {
          .menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 14px;
          }
          .search-section { padding: 16px 24px 10px; }
          .category-section { padding: 6px 24px 10px; }
          .menu-grid-area { padding: 6px 24px 100px; }
          .top-bar { padding: 14px 24px; }
        }

        @media (min-width: 1024px) {
          .main-layout { flex-direction: row; }

          .left-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
            min-width: 0;
          }

          .right-sidebar {
            display: flex;
            flex-direction: column;
            width: 380px;
            height: 100vh;
            border-left: 1px solid var(--border);
            background: var(--surface-2);
            flex-shrink: 0;
            overflow: hidden;
          }

          .mobile-cart-fab { display: none; }

          .menu-grid-area { padding-bottom: 24px; }
          .menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          }

          .search-section { padding: 16px 28px 10px; }
          .category-section { padding: 6px 28px 10px; }
          .menu-grid-area { padding: 6px 28px 28px; }
          .top-bar { padding: 16px 28px; }
        }

        @media (min-width: 1280px) {
          .right-sidebar { width: 420px; }
          .menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
          }
        }

        @media (min-width: 1536px) {
          .menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          }
        }
      `}} />

      {/* Toast */}
      {toast.show && (
        <div className="toast-container">
          <div className="toast-box">
            <span className="toast-msg">{toast.message}</span>
            <button className="toast-dismiss" onClick={() => setToast(prev => ({ ...prev, show: false }))}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Dispatch Overlay */}
      {checkoutLoading && (
        <div className="dispatch-overlay">
          <div className="dispatch-spinner" />
          <p className="dispatch-text">Pushing Order to Kitchen...</p>
        </div>
      )}

      {/* ========= MAIN LAYOUT ========= */}
      <div className="main-layout">

        {/* LEFT PANEL (Menu Side) */}
        <div className="left-panel">

          {/* Top Bar */}
          <div className="top-bar">
            <div className="top-bar-left">
              <button className="back-btn" onClick={() => window.location.href = "/dashboard/orders"}>
                <ArrowLeft style={{ width: 18, height: 18 }} />
              </button>
              <div className="top-bar-title">
                <h1>{editingOrderId ? `Edit Order #${editingOrderId}` : "Captain Order"}</h1>
                <p>{editingOrderId ? "Modify items & push update" : "Select items & push to kitchen"}</p>
              </div>
            </div>
            <div className="top-bar-right">
              {/* Table Dropdown */}
              <TableDropdown
                tables={tables}
                selectedTable={selectedTable}
                onSelect={(id: string) => setSelectedTable(id)}
                selectedTableObj={selectedTableObj}
              />
            </div>
          </div>

          {/* Search */}
          <div className="search-section">
            <div className="search-wrap">
              <Search />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="category-section">
            <button className="cat-scroll-btn" onClick={() => scrollCategories("left")}>
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <div className="cat-track hide-scroll" ref={categoryScrollRef}>
              <button
                className={`cat-chip ${selectedCategory === "All" ? "active" : ""}`}
                onClick={() => setSelectedCategory("All")}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`cat-chip ${selectedCategory === cat.name ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <button className="cat-scroll-btn" onClick={() => scrollCategories("right")}>
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Menu Grid */}
          <div className="menu-grid-area custom-scroll">
            <div className="menu-grid">
              {menuItems.map((item) => {
                const qtyInCart = getCartQty(item.id);
                return (
                  <div
                    key={item.id}
                    className={`menu-card ${qtyInCart > 0 ? "in-cart" : ""}`}
                  >
                    <div className="mc-icon-wrap">
                      <UtensilsCrossed />
                    </div>
                    <div className="mc-name">{item.name}</div>
                    <div className="mc-cat">{item.category?.name || "—"}</div>
                    <div className="mc-price">₹{parseFloat(item.price).toFixed(0)}</div>
                    <div className="mc-qty-control">
                      {qtyInCart === 0 ? (
                        <button className="mc-add-btn" onClick={() => adjustCartQty(item, 1)}>
                          Add
                        </button>
                      ) : (
                        <div className="mc-qty-stepper">
                          <button onClick={() => adjustCartQty(item, -1)}>−</button>
                          <span>{qtyInCart}</span>
                          <button onClick={() => adjustCartQty(item, 1)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {menuItems.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
                <UtensilsCrossed style={{ width: 40, height: 40, opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  No items found
                </p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT SIDEBAR (Desktop Only) */}
        <div className="right-sidebar">
          <CartPanel
            cart={cart}
            updateQty={updateQty}
            cartSubtotal={cartSubtotal}
            totalItems={totalItems}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerMobile={customerMobile}
            setCustomerMobile={setCustomerMobile}
            handleDispatchOrder={handleDispatchOrder}
            checkoutLoading={checkoutLoading}
            editingOrderId={editingOrderId}
          />
        </div>

        {/* MOBILE CART FAB */}
        {cart.length > 0 && (
          <button className="mobile-cart-fab" onClick={() => setMobileCartOpen(true)} style={{ display: undefined }}>
            <ShoppingCart style={{ width: 24, height: 24 }} />
            <span className="cart-badge">{totalItems}</span>
          </button>
        )}

        {/* MOBILE CART DRAWER */}
        {mobileCartOpen && (
          <>
            <div className="cart-overlay" onClick={() => setMobileCartOpen(false)} />
            <div className="cart-drawer">
              <div className="drawer-handle" />
              <div className="drawer-header">
                <h3>Your Order</h3>
                <span className="item-count">{totalItems} items</span>
                <button className="drawer-close" onClick={() => setMobileCartOpen(false)}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
              <CartPanel
                cart={cart}
                updateQty={updateQty}
                cartSubtotal={cartSubtotal}
                totalItems={totalItems}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerMobile={customerMobile}
                setCustomerMobile={setCustomerMobile}
                handleDispatchOrder={handleDispatchOrder}
                checkoutLoading={checkoutLoading}
                editingOrderId={editingOrderId}
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ========================================================
   TABLE DROPDOWN COMPONENT
   ======================================================== */
function TableDropdown({
  tables, selectedTable, onSelect, selectedTableObj
}: {
  tables: any[];
  selectedTable: string;
  onSelect: (id: string) => void;
  selectedTableObj: any;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getStatusClass = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "available" || s === "free") return "available";
    if (s === "occupied" || s === "busy") return "occupied";
    return "reserved";
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div className="table-selector" onClick={() => setOpen(!open)}>
        <div className="table-icon">
          <MapPin style={{ width: 14, height: 14 }} />
        </div>
        <div className="table-info">
          <span className="table-label">Table</span>
          <span className="table-name">
            {selectedTableObj ? selectedTableObj.tableNo : "Select"}
          </span>
        </div>
      </div>

      {open && (
        <div className="table-dropdown custom-scroll">
          {tables.map((t) => {
            const statusClass = getStatusClass(t.status);
            const isActive = t.id.toString() === selectedTable;
            return (
              <div
                key={t.id}
                className={`table-dropdown-item ${isActive ? "active" : ""}`}
                onClick={() => { onSelect(t.id.toString()); setOpen(false); }}
              >
                <div className={`td-icon td-${statusClass}`}>
                  {t.tableNo?.replace(/[^0-9]/g, "") || "#"}
                </div>
                <div className="td-info">
                  <div className="td-name">{t.tableNo}</div>
                  <div className={`td-status td-status-${statusClass}`}>
                    {t.status || "Available"}
                  </div>
                </div>
                {isActive && (
                  <div className="td-check">✓</div>
                )}
              </div>
            );
          })}
          {tables.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>
              No tables found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========================================================
   CART PANEL COMPONENT (reused in sidebar + mobile drawer)
   ======================================================== */
function CartPanel({
  cart, updateQty, cartSubtotal, totalItems,
  customerName, setCustomerName,
  customerMobile, setCustomerMobile,
  handleDispatchOrder, checkoutLoading, editingOrderId
}: {
  cart: any[];
  updateQty: (id: number, amount: number) => void;
  cartSubtotal: number;
  totalItems: number;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerMobile: string;
  setCustomerMobile: (v: string) => void;
  handleDispatchOrder: () => void;
  checkoutLoading: boolean;
  editingOrderId: string | null;
}) {
  return (
    <>
      {/* Cart Items */}
      <div className="cart-items-list custom-scroll" style={{ flex: 1 }}>
        {cart.length === 0 ? (
          <div className="cart-empty">
            <ShoppingCart />
            <p>No items selected</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.menuItemId} className="cart-item">
              <div className="ci-info">
                <div className="ci-name">{item.name}</div>
                <div className="ci-price">₹{item.price.toFixed(0)} each</div>
              </div>
              <span className="ci-total">₹{(item.price * item.qty).toFixed(0)}</span>
              <div className="ci-stepper">
                <button onClick={() => updateQty(item.menuItemId, -1)}>−</button>
                <span>{item.qty}</span>
                <button onClick={() => updateQty(item.menuItemId, 1)}>+</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details */}
      <div className="order-details-section">
        <div className="od-title">Customer Details (Optional)</div>
        <div className="od-inputs-row">
          <div className="od-row">
            <label className="od-label">Name</label>
            <div className="od-input-wrap">
              <User />
              <input
                className="od-input"
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
          </div>
          <div className="od-row">
            <label className="od-label">Mobile</label>
            <div className="od-input-wrap">
              <Phone />
              <input
                className="od-input"
                type="tel"
                placeholder="10-digit number"
                maxLength={10}
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Footer */}
      <div className="checkout-footer">
        <div className="checkout-total">
          <span className="checkout-total-label">Total</span>
          <span className="checkout-total-amount">₹{cartSubtotal.toFixed(0)}</span>
        </div>
        <button
          className="checkout-btn"
          onClick={handleDispatchOrder}
          disabled={checkoutLoading || cart.length === 0}
        >
          <Send style={{ width: 16, height: 16 }} />
          {editingOrderId ? "Update KOT" : "Push to Kitchen"}
        </button>
      </div>
    </>
  );
}
