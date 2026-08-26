"use client";

import { getBackendUrl } from "@/config/api";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import {
  Search,
  Plus,
  Minus,
  Edit2,
  Trash2,
  ChefHat,
  Printer,
  Sparkles,
  ShoppingBag,
  LayoutGrid,
  UtensilsCrossed,
  ArrowLeft,
  RotateCcw,
  PauseCircle,
  MessageCircle,
  Check,
  History as HistoryIcon,
  X,
  Maximize2,
  Minimize2,
  User,
  Star,
  Flame,
  Clock,
  Tag,
  Layers,
  CreditCard,
  Banknote,
  Smartphone,
  Package,
  Bike,
  IndianRupee,
  ArrowRight,
  ArrowRightLeft,
  Calculator as CalculatorIcon,
  Receipt,
  Coffee,
  Calendar,
  Filter,
  RefreshCw,
  Play,
  MoreVertical,
  SlidersHorizontal,
  Bell,
  HelpCircle,
  Percent,
  Split,
  FileText
} from "lucide-react";

interface CartItem {
  menuItemId: number;
  variantId?: number | null;
  variantName?: string | null;
  name: string;
  price: number;
  qty: number;
  spice?: string;
  variation?: string;
  notes?: string;
  addons?: { name: string; price: number }[];
  isExisting?: boolean;
  orderItemId?: number;
}

function PosContent() {
  const searchParams = useSearchParams();
  const initialTableId = searchParams.get("tableId");

  const [restaurant, setRestaurant] = useState<any>(null);

  // Core Datasets
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [allOrdersHistory, setAllOrdersHistory] = useState<any[]>([]);

  // Primary View Mode: "billing_terminal" vs "floor_plan" vs "qr_orders"
  const [posViewMode, setPosViewMode] = useState<"billing_terminal" | "floor_plan" | "qr_orders">("billing_terminal");

  // Table Status Filter & Search
  const [tableStatusFilter, setTableStatusFilter] = useState<"all" | "free" | "occupied" | "cooking">("all");
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Terminal State: Dine-In / Takeaway / Delivery
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Running Active Order & Cart State
  const [runningOrder, setRunningOrder] = useState<any | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // More Menu Dropdown in Cart
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Held Bills System
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Discount & Tax State
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [taxRate] = useState<number>(5); // 5% GST
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Customer Details Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchInput, setCustomerSearchInput] = useState("");

  // Payment Settlement State
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "split">("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");
  const [splitCashAmount, setSplitCashAmount] = useState<string>("");
  const [splitOnlineAmount, setSplitOnlineAmount] = useState<string>("");
  const [showSplitModal, setShowSplitModal] = useState(false);

  // Fullscreen & UI Layout Resizing
  const [categoryCollapsed, setCategoryCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals & Overlays
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<any | null>(null);
  const [showKOTModal, setShowKOTModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState("");

  // Table Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceTable, setTransferSourceTable] = useState<any | null>(null);
  const [transferTargetTableId, setTransferTargetTableId] = useState("");

  // History Modal Advanced State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState<"today" | "yesterday" | "last7days" | "all" | "custom">("today");
  const [historyCustomDate, setHistoryCustomDate] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "paid" | "unpaid" | "cooking">("all");
  const [historyFilterTable, setHistoryFilterTable] = useState("all");
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // QR Orders View Filtering
  const [qrFilter, setQrFilter] = useState<"all" | "pending" | "cooking">("all");
  const [qrSearchQuery, setQrSearchQuery] = useState("");

  // Item Variation / Customization Modal State (+Var)
  const [variationModal, setVariationModal] = useState<{
    open: boolean;
    dish: any | null;
    quantity: number;
    selectedVariation: { name: string; priceDelta: number; variantId?: number | null };
    selectedAddons: { name: string; price: number }[];
    spice: string;
    note: string;
  }>({
    open: false,
    dish: null,
    quantity: 1,
    selectedVariation: { name: "Regular", priceDelta: 0, variantId: null },
    selectedAddons: [],
    spice: "Normal",
    note: ""
  });

  // Per-Item Note Modal
  const [itemNoteModal, setItemNoteModal] = useState<{
    open: boolean;
    itemIndex: number;
    itemName: string;
    note: string;
  }>({
    open: false,
    itemIndex: -1,
    itemName: "",
    note: ""
  });

  // Table Add / Edit Modal in POS
  const [tableAddEditModal, setTableAddEditModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    tableId: number | null;
    tableNo: string;
  }>({
    open: false,
    mode: "add",
    tableId: null,
    tableNo: ""
  });

  // UI Loaders & Feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" | "info" }>({
    show: false,
    message: "",
    type: "info"
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const BACKEND_URL = getBackendUrl();

  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2800);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const formatTableTitle = (tableNo: string | number) => {
    const s = String(tableNo || "").trim();
    if (/^table\s+/i.test(s)) return s;
    if (/^\d+$/.test(s)) return `Table ${s}`;
    return s || "Table";
  };

  const fetchPosData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      const [catRes, itemRes, tablesRes, ordersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/menu/categories?_=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/menu/menu-items?_=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/tables?_=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/order?_=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : catData.data || []);
      }

      if (itemRes.ok) {
        const itemData = await itemRes.json();
        setMenuItems(Array.isArray(itemData) ? itemData : itemData.data || []);
      }

      let loadedTables: any[] = [];
      if (tablesRes.ok) {
        const tablesJson = await tablesRes.json();
        loadedTables = Array.isArray(tablesJson) ? tablesJson : tablesJson.data || [];
        setTables(loadedTables);
      }

      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json();
        const allOrders = Array.isArray(ordersJson) ? ordersJson : ordersJson.data || [];
        setAllOrdersHistory(allOrders);
        const unpaid = allOrders.filter((o: any) => o.paymentStatus === "unpaid" && !o.isMerged);
        setActiveOrders(unpaid);

        if (initialTableId && loadedTables.length > 0) {
          const match = loadedTables.find((t) => String(t.id) === String(initialTableId));
          if (match) {
            handleSelectTable(match, true, unpaid);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load POS data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderHistoryFromApi = async (
    dateFilter = historyDateFilter,
    customDate = historyCustomDate
  ) => {
    setHistoryLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      let url = `${BACKEND_URL}/api/order?limit=250&dateFilter=${dateFilter}&_=${Date.now()}`;
      if (dateFilter === "custom" && customDate) {
        url += `&customDate=${customDate}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        const ords = Array.isArray(json) ? json : json.data || json.orders || [];
        setHistoryOrders(ords);
      }
    } catch (err) {
      console.error("Failed to fetch order history:", err);
      triggerToast("Failed to refresh history", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryModal = (targetTable = "all") => {
    setHistoryFilterTable(targetTable);
    setShowHistoryModal(true);
    fetchOrderHistoryFromApi(historyDateFilter, historyCustomDate);
  };

  useEffect(() => {
    fetchPosData();

    const token = localStorage.getItem("authToken");
    if (token) {
      fetch(`${BACKEND_URL}/api/auth/restaurant`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d?.restaurant) setRestaurant(d.restaurant);
          else if (d?.id) setRestaurant(d);
        })
        .catch(() => {});
    }

    const savedHeld = localStorage.getItem("restuvexo_held_bills");
    if (savedHeld) {
      try {
        setHeldBills(JSON.parse(savedHeld));
      } catch (e) {}
    }

    const socket = io(BACKEND_URL, { transports: ["websocket"] });
    socket.on("new_order_placed", () => {
      fetchPosData();
      if (showHistoryModal) fetchOrderHistoryFromApi();
    });
    socket.on("order_status_updated", () => {
      fetchPosData();
      if (showHistoryModal) fetchOrderHistoryFromApi();
    });
    socket.on("table_updated", () => fetchPosData());
    socket.on("order_deleted", () => {
      fetchPosData();
      if (showHistoryModal) fetchOrderHistoryFromApi();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        setPosViewMode((prev) => (prev === "billing_terminal" ? "floor_plan" : "billing_terminal"));
      } else if (e.key === "F5") {
        e.preventDefault();
        setShowKOTModal(true);
      } else if (e.key === "F6") {
        e.preventDefault();
        setShowHeldModal(true);
      } else if (e.key === "F7") {
        e.preventDefault();
        setShowCalculator(true);
      } else if (e.key === "F8") {
        e.preventDefault();
        setPaymentMethod("cash");
      } else if (e.key === "F9") {
        e.preventDefault();
        setPaymentMethod("upi");
      } else if (e.key === "F10") {
        e.preventDefault();
        setPaymentMethod("card");
      } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
        // If no modal is open, enter triggers Settle & Print
        const isModalOpen =
          showHistoryModal ||
          showKOTModal ||
          showHeldModal ||
          showCustomerModal ||
          showDiscountModal ||
          showReceiptModal ||
          showTransferModal ||
          showCalculator ||
          variationModal.open ||
          itemNoteModal.open;
        if (!isModalOpen && cartItems.length > 0) {
          e.preventDefault();
          handleSettleBill(false);
        }
      } else if (e.key === "Escape") {
        setShowCalculator(false);
        setShowKOTModal(false);
        setShowHeldModal(false);
        setShowCustomerModal(false);
        setShowDiscountModal(false);
        setShowReceiptModal(false);
        setShowShiftModal(false);
        setShowTransferModal(false);
        setShowHistoryModal(false);
        setShowShortcutsModal(false);
        setShowSplitModal(false);
        setShowMoreMenu(false);
        setVariationModal((prev) => ({ ...prev, open: false }));
        setItemNoteModal((prev) => ({ ...prev, open: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      socket.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showHistoryModal, cartItems]);

  const handleSelectTable = (table: any, switchToTerminal = true, ordersList = activeOrders) => {
    setSelectedTable(table);
    setOrderType("dine_in");

    if (switchToTerminal) {
      setPosViewMode("billing_terminal");
    }

    const existingOrder = ordersList.find(
      (o) => (o.tableId === table.id || o.table?.id === table.id) && o.paymentStatus === "unpaid"
    );

    if (existingOrder) {
      setRunningOrder(existingOrder);
      setCustomerName(existingOrder.customerName || "");
      setCustomerPhone(existingOrder.customerPhone || "");

      const loadedCart = (existingOrder.orderItems || []).map((it: any) => ({
        menuItemId: it.menuItemId,
        name: it.menuItem?.name || "Dish Item",
        price: Number(it.price || 0),
        qty: it.qty,
        spice: it.spice || "Normal",
        notes: it.notes || "",
        addons: it.addons || [],
        isExisting: true,
        orderItemId: it.id
      }));
      setCartItems(loadedCart);
    } else {
      setRunningOrder(null);
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
    }
  };

  // 1-Click Fast Add (Zero modal friction)
  const handleDirectAddOne = (dish: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (orderType === "dine_in" && !selectedTable) {
      triggerToast("Select a table first", "error");
      return;
    }

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.menuItemId === dish.id && !item.isExisting && (!item.addons || item.addons.length === 0) && item.spice === "Normal"
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].qty += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            menuItemId: dish.id,
            name: dish.name,
            price: Number(dish.price),
            qty: 1,
            spice: "Normal",
            notes: "",
            addons: [],
            isExisting: false
          }
        ];
      }
    });
    triggerToast(`Added 1x ${dish.name}`, "success");
  };

  // ⚡ Super Fast Instant Thermal Print Utility (Zero DOM Overhead, <100ms Preview)
  const printThermalReceipt = (order: any) => {
    if (!order) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const itemsHtml = (order.items || [])
      .map(
        (it: any) => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span style="font-weight: 700;">${it.name || it.menuItem?.name} x${it.qty}</span>
          <span style="font-weight: 900;">₹${Number(it.price * it.qty).toFixed(2)}</span>
        </div>
        ${it.spice && it.spice !== "Normal" ? `<div style="font-size: 9px; color: #333; margin-left: 6px;">• Spice: ${it.spice}</div>` : ""}
        ${it.notes ? `<div style="font-size: 9px; color: #333; margin-left: 6px;">• Note: ${it.notes}</div>` : ""}
      `
      )
      .join("");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${order.receiptNo || order.id}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              width: 72mm;
              margin: 0 auto;
              padding: 6px 4px;
              font-family: 'Courier New', Courier, monospace, monospace;
              font-size: 11px;
              color: #000;
              background: #fff;
              line-height: 1.25;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${restaurant?.name || "RESTUVEXO RESTAURANT"}</div>
            <div style="font-size: 9px; margin-top: 1px; color: #444;">${restaurant?.address || "RESTAURANT OPERATING SYSTEM"}</div>
            <div style="font-size: 9px; color: #444;">Phone: ${restaurant?.phone || "01700000000"}</div>
            <div style="font-size: 10px; font-weight: 900; margin-top: 4px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0;">TAX INVOICE</div>
          </div>

          <div class="divider"></div>

          <div style="font-size: 10px;">
            <div class="row"><span>Invoice: #${order.receiptNo || order.id}</span><span>${new Date(order.createdAt || Date.now()).toLocaleTimeString()}</span></div>
            <div class="row"><span>Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}</span><span>Pay: ${order.paymentMethod?.toUpperCase() || "CASH"}</span></div>
            <div class="row" style="font-weight: bold; margin-top: 1px;">
              <span>Type: ${(order.orderType || orderType || "Dine-In").toUpperCase()}</span>
              <span>${order.table?.tableNo ? `Table: ${order.table.tableNo}` : "Takeaway / Counter"}</span>
            </div>
            ${order.customerName ? `<div class="row" style="margin-top: 1px;"><span>Customer: ${order.customerName}</span><span>${order.customerPhone || ""}</span></div>` : ""}
          </div>

          <div class="divider"></div>

          <div style="margin: 4px 0;">
            ${itemsHtml}
          </div>

          <div class="divider"></div>

          <div style="font-size: 10px;">
            <div class="row"><span>Subtotal</span><span>₹${Number(order.subtotal || order.totalAmount || 0).toFixed(2)}</span></div>
            ${order.discountApplied > 0 ? `<div class="row" style="color: #000;"><span>Discount</span><span>-₹${Number(order.discountApplied).toFixed(2)}</span></div>` : ""}
            <div class="row" style="font-size: 13px; font-weight: 900; margin-top: 3px; border-top: 1px dashed #000; padding-top: 3px;">
              <span>TOTAL PAID</span>
              <span>₹${Number(order.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="center" style="font-size: 9px; margin-top: 4px;">
            <div>Thank you for dining with us!</div>
            <div>Powered by RESTUVEXO</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
      }, 2000);
    }, 50);
  };

  // Open Customization Modal (+Var)
  const handleOpenCustomizationModal = (dish: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (orderType === "dine_in" && !selectedTable) {
      triggerToast("Select a table first", "error");
      return;
    }

    setVariationModal({
      open: true,
      dish,
      quantity: 1,
      selectedVariation: { name: "Regular", priceDelta: 0 },
      selectedAddons: [],
      spice: "Normal",
      note: ""
    });
  };

  const handleConfirmCustomization = () => {
    if (!variationModal.dish) return;

    const basePrice = Number(variationModal.dish.price);
    const varDelta = variationModal.selectedVariation.priceDelta;
    const addonsTotal = variationModal.selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const finalPrice = Math.max(0, basePrice + varDelta + addonsTotal);

    const displayName =
      variationModal.selectedVariation.name === "Regular"
        ? variationModal.dish.name
        : `${variationModal.dish.name} (${variationModal.selectedVariation.name})`;

    setCartItems((prev) => [
      ...prev,
      {
        menuItemId: variationModal.dish.id,
        variantId: variationModal.selectedVariation?.variantId || null,
        variantName: variationModal.selectedVariation?.name !== "Regular" ? variationModal.selectedVariation.name : null,
        name: displayName,
        price: finalPrice,
        qty: variationModal.quantity || 1,
        spice: variationModal.spice,
        notes: variationModal.note,
        addons: variationModal.selectedAddons,
        isExisting: false
      }
    ]);

    setVariationModal({
      open: false,
      dish: null,
      quantity: 1,
      selectedVariation: { name: "Regular", priceDelta: 0 },
      selectedAddons: [],
      spice: "Normal",
      note: ""
    });
    triggerToast(`Added ${displayName}`, "success");
  };

  const handleUpdateQty = (idx: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = updated[idx].qty + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      } else {
        updated[idx].qty = newQty;
        return updated;
      }
    });
  };

  const handleRemoveCartItem = (idx: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveItemNote = () => {
    if (itemNoteModal.itemIndex >= 0 && itemNoteModal.itemIndex < cartItems.length) {
      const updated = [...cartItems];
      updated[itemNoteModal.itemIndex].notes = itemNoteModal.note;
      setCartItems(updated);
      triggerToast("Special note saved", "success");
    }
    setItemNoteModal({ open: false, itemIndex: -1, itemName: "", note: "" });
  };

  // Hold / Park Bills
  const handleHoldBill = () => {
    if (cartItems.length === 0) {
      triggerToast("Cart is empty - add dishes to hold", "error");
      return;
    }
    const currentSubtotal = cartItems.reduce((s, it) => s + it.price * it.qty, 0);
    const heldItem = {
      id: Date.now(),
      orderType,
      selectedTable,
      guestCount,
      cartItems: [...cartItems],
      customerName,
      customerPhone,
      totalAmount: currentSubtotal,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    const updated = [heldItem, ...heldBills];
    setHeldBills(updated);
    localStorage.setItem("restuvexo_held_bills", JSON.stringify(updated));
    setCartItems([]);
    setSelectedTable(null);
    setRunningOrder(null);
    setCustomerName("");
    setCustomerPhone("");
    setShowMoreMenu(false);
    triggerToast(`Bill parked to Held (${updated.length})`, "info");
  };

  const handleRecallHeldBill = (held: any) => {
    setSelectedTable(held.selectedTable);
    setOrderType(held.orderType || "dine_in");
    setGuestCount(held.guestCount || 2);
    setCartItems(held.cartItems || []);
    setCustomerName(held.customerName || "");
    setCustomerPhone(held.customerPhone || "");
    setRunningOrder(null);

    const updated = heldBills.filter((b) => b.id !== held.id);
    setHeldBills(updated);
    localStorage.setItem("restuvexo_held_bills", JSON.stringify(updated));
    setShowHeldModal(false);
    setPosViewMode("billing_terminal");
    triggerToast("Recalled held bill to terminal", "success");
  };

  const handleDeleteHeldBill = (heldId: number) => {
    const updated = heldBills.filter((b) => b.id !== heldId);
    setHeldBills(updated);
    localStorage.setItem("restuvexo_held_bills", JSON.stringify(updated));
    triggerToast("Discarded held bill", "info");
  };

  const handleTransferTable = async () => {
    if (!transferSourceTable || !transferTargetTableId) {
      triggerToast("Select a target table", "error");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const activeOrder = activeOrders.find(
        (o) => o.tableId === transferSourceTable.id || o.table?.id === transferSourceTable.id
      );
      if (!activeOrder) throw new Error("No active order found on source table");

      const res = await fetch(`${BACKEND_URL}/api/order/${activeOrder.id}/move-table`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newTableId: parseInt(transferTargetTableId) })
      });

      if (!res.ok) throw new Error("Failed to transfer table");
      triggerToast(`Transferred order to ${formatTableTitle(transferTargetTableId)}`, "success");
      setShowTransferModal(false);
      setTransferSourceTable(null);
      fetchPosData();
    } catch (err: any) {
      triggerToast(err.message || "Transfer failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + it.price * it.qty, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (discountVal <= 0) return 0;
    if (discountType === "percent") {
      return Math.round((subtotal * discountVal) / 100);
    }
    return Math.min(subtotal, discountVal);
  }, [subtotal, discountType, discountVal]);

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((afterDiscount * taxRate) / 100);
  const grandTotal = Math.round(afterDiscount + taxAmount);

  const cashChange = useMemo(() => {
    const recv = parseFloat(cashReceived);
    if (isNaN(recv) || recv < grandTotal) return 0;
    return recv - grandTotal;
  }, [cashReceived, grandTotal]);

  const handleGenerateUpiQr = async () => {
    if (grandTotal <= 0) return;
    const upiId = restaurant?.upiId || "restuvexo@upi";
    const payeeName = encodeURIComponent(restaurant?.name || "RESTUVEXO Restaurant");
    const upiUri = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${grandTotal}&cu=INR&tn=Bill%20Payment`;

    try {
      const dataUrl = await QRCode.toDataURL(upiUri, { width: 220, margin: 1 });
      setUpiQrDataUrl(dataUrl);
    } catch (err) {
      console.error("UPI QR Error:", err);
    }
  };

  useEffect(() => {
    if (paymentMethod === "upi" && grandTotal > 0) {
      handleGenerateUpiQr();
    }
  }, [paymentMethod, grandTotal]);

  const handleSendKOT = async () => {
    if (cartItems.length === 0) {
      triggerToast("Cart is empty", "error");
      return;
    }
    if (orderType === "dine_in" && !selectedTable) {
      triggerToast("Select a table first", "error");
      return;
    }

    const newItemsOnly = cartItems.filter((it) => !it.isExisting);
    if (newItemsOnly.length === 0) {
      triggerToast("No new dishes to send", "info");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const payload = {
        tableId: selectedTable?.id || null,
        orderType,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        items: cartItems.map((it) => ({
          menuItemId: it.menuItemId,
          variantId: it.variantId || null,
          variantName: it.variantName || null,
          qty: it.qty,
          price: it.price,
          spice: it.spice,
          notes: it.notes,
          addons: it.addons
        }))
      };

      let res;
      if (runningOrder?.id) {
        res = await fetch(`${BACKEND_URL}/api/order/${runningOrder.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: payload.items })
        });
      } else {
        res = await fetch(`${BACKEND_URL}/api/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error("Failed to send order to kitchen");
      const orderJson = await res.json();
      const savedOrder = orderJson.order || orderJson;

      setRunningOrder(savedOrder);
      setCartItems((prev) => prev.map((it) => ({ ...it, isExisting: true })));
      triggerToast(`KOT #${savedOrder.receiptNo || savedOrder.id} sent to Kitchen!`, "success");
      fetchPosData();
    } catch (err: any) {
      triggerToast(err.message || "Failed to send KOT", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettleBill = async (autoShareWhatsApp = false) => {
    if (cartItems.length === 0 && !runningOrder) {
      triggerToast("Cart is empty", "error");
      return;
    }
    if (orderType === "dine_in" && !selectedTable) {
      triggerToast("Select a table first", "error");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      let orderIdToSettle = runningOrder?.id;

      if (!orderIdToSettle) {
        const createRes = await fetch(`${BACKEND_URL}/api/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            tableId: selectedTable?.id || null,
            orderType,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            items: cartItems.map((it) => ({
              menuItemId: it.menuItemId,
              variantId: it.variantId || null,
              variantName: it.variantName || null,
              qty: it.qty,
              price: it.price,
              spice: it.spice,
              notes: it.notes,
              addons: it.addons
            }))
          })
        });

        if (!createRes.ok) throw new Error("Failed to create order");
        const newOrd = await createRes.json();
        orderIdToSettle = (newOrd.order || newOrd).id;
      }

      const settleRes = await fetch(`${BACKEND_URL}/api/order/${orderIdToSettle}/settle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          paymentMethod: paymentMethod === "split" ? "split_cash_online" : paymentMethod,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          totalAmount: grandTotal,
          cashReceived: paymentMethod === "cash" ? parseFloat(cashReceived) || grandTotal : null,
          changeReturned: paymentMethod === "cash" ? cashChange : null
        })
      });

      if (!settleRes.ok) throw new Error("Failed to settle bill");
      const settledOrder = await settleRes.json();

      const completedOrderData = {
        id: orderIdToSettle,
        receiptNo: settledOrder.receiptNo || `REC-${orderIdToSettle}`,
        table: selectedTable,
        orderType,
        items: [...cartItems],
        subtotal,
        discountApplied: discountAmount,
        totalAmount: grandTotal,
        paymentMethod,
        customerName,
        customerPhone,
        createdAt: new Date().toISOString()
      };

      setLastCompletedOrder(completedOrderData);
      setShowReceiptModal(true);
      setCartItems([]);
      setSelectedTable(null);
      setRunningOrder(null);
      setCashReceived("");
      triggerToast(`Bill Settled! #${settledOrder.receiptNo || orderIdToSettle}`, "success");
      fetchPosData();

      if (autoShareWhatsApp && customerPhone) {
        handleShareWhatsApp(completedOrderData);
      } else {
        // ⚡ Super Fast Instant Thermal Print
        printThermalReceipt(completedOrderData);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to settle bill", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareWhatsApp = (orderData = lastCompletedOrder) => {
    if (!orderData) return;
    const phone = orderData.customerPhone || "";
    const itemsList = orderData.items
      ?.map((it: any) => `• ${it.name} x${it.qty} = ₹${it.price * it.qty}`)
      .join("%0A");
    const msg = `*${restaurant?.name || "RESTUVEXO"} - Tax Invoice*%0A%0AInvoice: #${orderData.receiptNo}%0ATable: ${orderData.table?.tableNo ? formatTableTitle(orderData.table.tableNo) : "Takeaway"}%0A%0A*Items:*%0A${itemsList}%0A%0A*Total Paid:* ₹${orderData.totalAmount}%0APayment Method: ${orderData.paymentMethod?.toUpperCase()}%0A%0A_Thank you for dining with us!_`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
  };

  const handleCalcClick = (val: string) => {
    if (val === "C") {
      setCalcInput("");
      setCalcResult("");
    } else if (val === "=") {
      try {
        const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, "");
        const evalResult = Function(`'use strict'; return (${sanitized})`)();
        setCalcResult(String(evalResult));
      } catch (e) {
        setCalcResult("Error");
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  // Operational Stats
  const todayLiveStats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const paidOrdersToday = allOrdersHistory.filter((o) => {
      const isPaid = o.paymentStatus === "paid";
      const isToday = new Date(o.createdAt) >= startOfToday;
      return isPaid && isToday;
    });

    const totalRevenue = paidOrdersToday.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const cookingCount = activeOrders.filter((o) => o.status === "cooking" || o.status === "pending").length;
    const occupiedCount = activeOrders.length;
    const freeCount = Math.max(0, tables.length - occupiedCount);

    return {
      totalRevenue,
      paidCount: paidOrdersToday.length,
      cookingCount,
      occupiedCount,
      freeCount,
      totalOrdersToday: allOrdersHistory.length,
      runningOrdersCount: activeOrders.length
    };
  }, [allOrdersHistory, activeOrders, tables]);

  const qrOrdersList = useMemo(() => {
    return activeOrders.filter((o) => {
      return (
        o.creator?.name === "QR Customer" ||
        o.customerName === "Self-Order Customer" ||
        o.orderType === "dine_in" ||
        Boolean(o.tableId)
      );
    });
  }, [activeOrders]);

  const pendingQrCount = useMemo(() => {
    return activeOrders.filter((o) => o.status === "pending").length;
  }, [activeOrders]);

  const filteredQrOrders = useMemo(() => {
    return qrOrdersList.filter((o) => {
      if (qrFilter === "pending" && o.status !== "pending") return false;
      if (qrFilter === "cooking" && o.status !== "cooking") return false;

      if (qrSearchQuery) {
        const q = qrSearchQuery.toLowerCase();
        const tNo = String(o.table?.tableNo || "").toLowerCase();
        const rec = String(o.receiptNo || o.id).toLowerCase();
        const cust = String(o.customerName || "").toLowerCase();
        return tNo.includes(q) || rec.includes(q) || cust.includes(q);
      }
      return true;
    });
  }, [qrOrdersList, qrFilter, qrSearchQuery]);

  const filteredHistoryModalOrders = useMemo(() => {
    const sourceList = historyOrders.length > 0 ? historyOrders : allOrdersHistory;

    return sourceList.filter((o) => {
      if (historyStatusFilter === "paid" && o.paymentStatus !== "paid") return false;
      if (historyStatusFilter === "unpaid" && o.paymentStatus !== "unpaid") return false;
      if (historyStatusFilter === "cooking" && o.status !== "cooking" && o.status !== "pending") return false;

      if (historyFilterTable !== "all") {
        const tableMatch = String(o.table?.tableNo || o.tableNo || "").toLowerCase() === historyFilterTable.toLowerCase();
        if (!tableMatch) return false;
      }

      if (!historySearchQuery) return true;
      const q = historySearchQuery.toLowerCase();
      const rec = String(o.receiptNo || o.id).toLowerCase();
      const tNo = String(o.table?.tableNo || o.tableNo || "").toLowerCase();
      const cust = String(o.customerName || "").toLowerCase();
      const phone = String(o.customerPhone || "").toLowerCase();
      return rec.includes(q) || tNo.includes(q) || cust.includes(q) || phone.includes(q);
    });
  }, [historyOrders, allOrdersHistory, historyStatusFilter, historyFilterTable, historySearchQuery]);

  const historyTotals = useMemo(() => {
    const paidList = filteredHistoryModalOrders.filter((o) => o.paymentStatus === "paid");
    const totalRev = paidList.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const cash = paidList.filter((o) => o.paymentMethod === "cash").reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const upi = paidList.filter((o) => o.paymentMethod === "upi").reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const card = paidList.filter((o) => o.paymentMethod === "card").reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return { totalRev, count: filteredHistoryModalOrders.length, paidCount: paidList.length, cash, upi, card };
  }, [filteredHistoryModalOrders]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const orderOnTable = activeOrders.find(
        (o) => (o.tableId === table.id || o.table?.id === table.id) && o.paymentStatus === "unpaid"
      );

      if (tableStatusFilter === "free" && orderOnTable) return false;
      if (tableStatusFilter === "occupied" && !orderOnTable) return false;
      if (tableStatusFilter === "cooking" && (!orderOnTable || (orderOnTable.status !== "cooking" && orderOnTable.status !== "pending")))
        return false;

      if (tableSearchQuery) {
        const q = tableSearchQuery.toLowerCase().trim();
        const cleanNo = String(table.tableNo).toLowerCase();
        const custName = String(orderOnTable?.customerName || "").toLowerCase();
        const receiptNo = String(orderOnTable?.receiptNo || orderOnTable?.id || "").toLowerCase();
        return cleanNo.includes(q) || custName.includes(q) || receiptNo.includes(q);
      }

      return true;
    });
  }, [tables, activeOrders, tableStatusFilter, tableSearchQuery]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      let matchesCategory = true;
      if (activeCategory === "favorites") {
        matchesCategory = item.isFavorite || item.isFeatured || false;
      } else if (activeCategory === "bestsellers") {
        matchesCategory = item.isBestseller || item.price > 200;
      } else if (activeCategory !== "All") {
        matchesCategory =
          item.category?.name === activeCategory ||
          item.categoryId === parseInt(activeCategory);
      }

      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.price).includes(searchQuery);

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#ff5722] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen max-h-screen bg-[#f8fafc] flex flex-col select-none font-sans overflow-hidden p-2 text-slate-800 antialiased">

      {/* 1. PROFESSIONAL HIGH-SPEED HEADER */}
      <header className="bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 shrink-0 mb-1.5">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className="flex items-center gap-1.5 pl-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-slate-900 tracking-tight">RESTUVEXO POS</span>
            <span className="hidden md:inline text-[10px] font-bold text-slate-400">
              • {restaurant?.name || "Terminal 1"}
            </span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setPosViewMode("billing_terminal")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              posViewMode === "billing_terminal"
                ? "bg-[#ff5722] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Billing Terminal</span>
          </button>

          <button
            onClick={() => setPosViewMode("floor_plan")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              posViewMode === "floor_plan"
                ? "bg-[#ff5722] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Table View ({tables.length})</span>
          </button>

          <button
            onClick={() => setPosViewMode("qr_orders")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 relative ${
              posViewMode === "qr_orders"
                ? "bg-[#ff5722] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>QR ({qrOrdersList.length})</span>
            {pendingQrCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                {pendingQrCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Actions Right Toolbar */}
        <div className="flex items-center gap-1.5">
          <div className="relative w-36 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search (F2)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold pl-8 pr-6 py-1.5 rounded-xl focus:outline-none focus:border-[#ff5722] focus:bg-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowKOTModal(true)}
            title="Kitchen Order Tickets (F5)"
            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black border border-amber-200 flex items-center gap-1 cursor-pointer"
          >
            <ChefHat className="w-3.5 h-3.5 text-amber-700" />
            <span>KOT {todayLiveStats.cookingCount}</span>
          </button>

          <button
            onClick={() => setShowHeldModal(true)}
            title="Parked / Held Bills (F6)"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1 cursor-pointer transition active:scale-96 ${
              heldBills.length > 0
                ? "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs animate-pulse"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
            }`}
          >
            <PauseCircle className={`w-3.5 h-3.5 ${heldBills.length > 0 ? "text-indigo-600" : "text-slate-400"}`} />
            <span>Held ({heldBills.length})</span>
          </button>

          <button
            onClick={() => handleOpenHistoryModal("all")}
            title="Order History & Invoices"
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition active:scale-96"
          >
            <HistoryIcon className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden lg:inline">History</span>
          </button>

          <button
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts Cheat-sheet"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Fullscreen Mode"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => fetchPosData()}
            title="Sync Data"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. BILLING TERMINAL VIEW */}
      {posViewMode === "billing_terminal" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-1.5">

          {/* TOP BAR: ORDER TYPES & RICH TABLE STATUS CHIPS */}
          <div className="bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* 3-Way Order Type Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setOrderType("dine_in")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  orderType === "dine_in"
                    ? "bg-[#ff5722] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Dine-In</span>
              </button>

              <button
                onClick={() => {
                  setOrderType("takeaway");
                  setSelectedTable(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  orderType === "takeaway"
                    ? "bg-[#ff5722] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Takeaway</span>
              </button>

              <button
                onClick={() => {
                  setOrderType("delivery");
                  setSelectedTable(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  orderType === "delivery"
                    ? "bg-[#ff5722] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Delivery</span>
              </button>
            </div>

            {/* Scrollable Table Chips with Live Amount and Status Indicators */}
            {orderType === "dine_in" ? (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin flex-1 py-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 shrink-0 mr-0.5">TABLES:</span>
                {tables.map((table) => {
                  const orderOnTable = activeOrders.find(
                    (o) => (o.tableId === table.id || o.table?.id === table.id) && o.paymentStatus === "unpaid"
                  );
                  const isSelected = selectedTable?.id === table.id;
                  const tableTitle = formatTableTitle(table.tableNo);

                  return (
                    <button
                      key={table.id}
                      onClick={() => handleSelectTable(table, false)}
                      className={`px-2.5 py-1 rounded-xl border text-xs font-black shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                        orderOnTable
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                      } ${isSelected ? "ring-2 ring-[#ff5722] shadow-xs" : ""}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${orderOnTable ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                      <span>{tableTitle}</span>
                      {orderOnTable ? (
                        <span className="text-[10px] bg-rose-200/80 px-1 py-0.2 rounded text-rose-950 font-black">
                          ₹{Number(orderOnTable.totalAmount || 0)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-emerald-600 font-bold opacity-80">Free</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 text-xs text-slate-500 font-bold px-2 flex items-center gap-1.5">
                {orderType === "takeaway" ? (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5 text-[#ff5722]" />
                    <span>Direct Counter Takeaway Mode Active</span>
                  </>
                ) : (
                  <>
                    <Bike className="w-3.5 h-3.5 text-blue-600" />
                    <span>Doorstep Delivery Order Mode Active</span>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setPosViewMode("floor_plan")}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-orange-400" />
              <span>Floor Plan</span>
            </button>
          </div>

          {/* MAIN 3-PANEL INTERFACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden items-stretch">

            {/* PANEL 1: CATEGORIES (Left ~20%) */}
            <div
              className={`${
                categoryCollapsed ? "lg:col-span-1" : "lg:col-span-2"
              } bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden transition-all duration-200`}
            >
              <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                {!categoryCollapsed && (
                  <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Categories</span>
                )}
                <button
                  onClick={() => setCategoryCollapsed(!categoryCollapsed)}
                  className="p-1 px-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black transition cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-1.5 space-y-1 scrollbar-thin">
                <button
                  onClick={() => setActiveCategory("favorites")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    activeCategory === "favorites" ? "bg-amber-500 text-white shadow-xs" : "text-amber-800 bg-amber-50/60 hover:bg-amber-100/70"
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                  {!categoryCollapsed && <span>Favorites</span>}
                </button>

                <button
                  onClick={() => setActiveCategory("bestsellers")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    activeCategory === "bestsellers" ? "bg-rose-500 text-white shadow-xs" : "text-rose-800 bg-rose-50/60 hover:bg-rose-100/70"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 fill-current shrink-0" />
                  {!categoryCollapsed && <span>Best Sellers</span>}
                </button>

                <button
                  onClick={() => setActiveCategory("All")}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-between ${
                    activeCategory === "All" ? "bg-[#ff5722] text-white shadow-xs" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{categoryCollapsed ? "All" : "All Dishes"}</span>
                  {!categoryCollapsed && <span className="text-[10px] opacity-80">{menuItems.length}</span>}
                </button>

                {categories.map((cat) => {
                  const catCount = menuItems.filter(
                    (m) => m.category?.name === cat.name || m.categoryId === cat.id
                  ).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.name)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                        activeCategory === cat.name ? "bg-[#ff5722] text-white font-black shadow-xs" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="truncate">{categoryCollapsed ? cat.name.slice(0, 4) : cat.name}</span>
                      {!categoryCollapsed && <span className="text-[10px] opacity-70">({catCount})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PANEL 2: FOOD TILES (Center ~52%) */}
            <div
              className={`${
                categoryCollapsed ? "lg:col-span-7" : "lg:col-span-6"
              } bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden space-y-2 transition-all duration-200`}
            >
              <div className="flex items-center justify-between px-1 shrink-0">
                <span className="text-xs font-black text-slate-900">
                  {activeCategory} ({filteredMenuItems.length} Dishes)
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Tap card to add 1x • Tap <span className="text-orange-600 font-bold">[ +Var ]</span> to customize
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 overflow-y-auto p-1 flex-1 content-start scrollbar-thin">
                {filteredMenuItems.map((dish) => {
                  const inCartQty = cartItems
                    .filter((c) => c.menuItemId === dish.id)
                    .reduce((sum, it) => sum + it.qty, 0);

                  const isVeg = dish.isVeg || dish.name.toLowerCase().includes("veg") || dish.name.toLowerCase().includes("paneer");

                  return (
                    <div
                      key={dish.id}
                      onClick={(e) => handleDirectAddOne(dish, e)}
                      className="h-[108px] p-2.5 rounded-2xl border border-slate-200 hover:border-orange-500 bg-white hover:bg-orange-50/25 transition-all flex flex-col justify-between group cursor-pointer shadow-2xs relative overflow-hidden active:scale-97 select-none"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />

                      {inCartQty > 0 && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#ff5722] text-white shadow-xs">
                          {inCartQty}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className="text-[9px] font-black text-slate-400 uppercase truncate">
                          {dish.category?.name || "Dish"}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-tight group-hover:text-[#ff5722] my-0.5">
                        {dish.name}
                      </h4>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 shrink-0">
                        <span className="text-xs font-black text-slate-900">₹{Number(dish.price).toLocaleString("en-IN")}</span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleOpenCustomizationModal(dish, e)}
                            title="Customize (Portion, Spice, Addons)"
                            className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 text-[9px] font-bold cursor-pointer transition"
                          >
                            +Var
                          </button>

                          <div className="w-6 h-6 rounded-lg bg-orange-50 text-[#ff5722] group-hover:bg-[#ff5722] group-hover:text-white flex items-center justify-center transition-colors">
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PANEL 3: HIGH-SPEED CART & SETTLEMENT (Right ~28%) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden justify-between">

              {/* Dynamic Header State */}
              <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase text-slate-900 flex items-center gap-1">
                      {orderType === "dine_in" ? (
                        selectedTable ? formatTableTitle(selectedTable.tableNo) : "Dine-In"
                      ) : orderType === "takeaway" ? (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5 text-[#ff5722]" />
                          <span>Takeaway Bill</span>
                        </>
                      ) : (
                        <>
                          <Bike className="w-3.5 h-3.5 text-blue-600" />
                          <span>Delivery Bill</span>
                        </>
                      )}
                    </span>
                    {runningOrder && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-900">
                        #{runningOrder.receiptNo || runningOrder.id}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    {orderType === "dine_in" && selectedTable ? `${guestCount} Guests • Waiter: Cashier` : `${cartItems.length} items`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 relative">
                  {cartItems.length > 0 && !runningOrder && (
                    <button
                      onClick={handleHoldBill}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black border border-indigo-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Park / Hold this active bill"
                    >
                      <PauseCircle className="w-3 h-3 text-indigo-600" /> Hold
                    </button>
                  )}

                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    title="More actions"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* More Actions Dropdown */}
                  {showMoreMenu && (
                    <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 w-44 space-y-0.5 text-xs animate-fade-in">
                      <button
                        onClick={handleHoldBill}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-lg font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Hold Order</span>
                      </button>

                      {selectedTable && (
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            setTransferSourceTable(selectedTable);
                            setShowTransferModal(true);
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-lg font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
                          <span>Transfer Table</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowCalculator(true);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-lg font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                      >
                        <CalculatorIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Calculator</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          handleOpenHistoryModal(selectedTable ? selectedTable.tableNo : "all");
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-lg font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                      >
                        <HistoryIcon className="w-3.5 h-3.5 text-orange-500" />
                        <span>View Past Orders</span>
                      </button>

                      {cartItems.length > 0 && !runningOrder && (
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            setCartItems([]);
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 rounded-lg font-bold text-rose-600 flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear Cart</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Cart Items List */}
              <div className="p-3 overflow-y-auto flex-1 space-y-2 divide-y divide-slate-100 scrollbar-thin">
                {orderType === "dine_in" && !selectedTable ? (
                  <div className="py-14 text-center text-slate-400 text-xs font-semibold space-y-2">
                    <Coffee className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="font-black text-slate-800 text-sm">Select a Table First</p>
                    <p className="text-[11px]">Click on any table chip above or switch to Table View.</p>
                    <button
                      onClick={() => setPosViewMode("floor_plan")}
                      className="px-3 py-1.5 bg-[#ff5722] text-white text-xs font-black rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> View Floor Map
                    </button>
                  </div>
                ) : cartItems.length === 0 ? (
                  <div className="py-14 text-center text-slate-400 text-xs font-semibold space-y-1">
                    <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-black text-slate-700">Cart is Empty</p>
                    <p className="text-[10px]">Tap dishes from the menu to start order</p>
                  </div>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="pt-2 flex items-start justify-between gap-1.5 text-xs">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <span className="font-black text-slate-900 text-xs truncate block">{item.name}</span>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 flex-wrap">
                          <span>₹{item.price} × {item.qty}</span>
                          {item.spice && item.spice !== "Normal" && (
                            <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">[{item.spice}]</span>
                          )}
                          {item.notes && <span className="text-indigo-600 font-bold">"{item.notes}"</span>}
                        </div>
                        <button
                          onClick={() =>
                            setItemNoteModal({
                              open: true,
                              itemIndex: idx,
                              itemName: item.name,
                              note: item.notes || ""
                            })
                          }
                          className="text-[9px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>{item.notes ? "Edit Note" : "+ Note"}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                          <button
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 font-black cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-1.5 text-xs font-black text-slate-900">{item.qty}</span>
                          <button
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 font-black cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <span className="text-xs font-black text-slate-900 w-12 text-right">
                          ₹{item.price * item.qty}
                        </span>

                        <button onClick={() => handleRemoveCartItem(idx)} className="text-slate-300 hover:text-rose-600 p-0.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Billing Box */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
                {/* Customer & Discount Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer truncate shadow-2xs hover:bg-slate-100"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customerName ? `${customerName} (${customerPhone || ""})` : "Add Customer"}</span>
                  </button>

                  <button
                    onClick={() => setShowDiscountModal(true)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer shadow-2xs hover:bg-slate-100"
                  >
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>{discountAmount > 0 ? `Disc: -₹${discountAmount}` : "Discount"}</span>
                  </button>
                </div>

                {/* Structured Financial Summary */}
                <div className="space-y-0.5 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold">₹{subtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span>₹{taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-0.5 border-t border-dashed border-slate-200">
                    <span>TOTAL</span>
                    <span className="text-[#ff5722] text-base">₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Send KOT Button */}
                <button
                  onClick={handleSendKOT}
                  disabled={actionLoading || cartItems.length === 0}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                >
                  <ChefHat className="w-4 h-4 text-orange-400" />
                  <span>SEND KOT TO KITCHEN</span>
                </button>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-1.5 rounded-xl text-xs font-black border cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === "cash"
                        ? "bg-[#ff5722] border-[#ff5722] text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("upi")}
                    className={`py-1.5 rounded-xl text-xs font-black border cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === "upi"
                        ? "bg-[#ff5722] border-[#ff5722] text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>UPI</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`py-1.5 rounded-xl text-xs font-black border cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === "card"
                        ? "bg-[#ff5722] border-[#ff5722] text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card</span>
                  </button>

                  <button
                    onClick={() => setShowSplitModal(true)}
                    className={`py-1.5 rounded-xl text-xs font-black border cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === "split"
                        ? "bg-[#ff5722] border-[#ff5722] text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Split</span>
                  </button>
                </div>

                {/* Quick Cash Presets when Cash selected */}
                {paymentMethod === "cash" && grandTotal > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <span className="text-slate-400 uppercase text-[9px] mr-0.5">Recv:</span>
                    {[500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setCashReceived(String(amt))}
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        ₹{amt}
                      </button>
                    ))}
                    {parseFloat(cashReceived) >= grandTotal && (
                      <span className="ml-auto text-emerald-600 font-black">
                        Change: ₹{cashChange}
                      </span>
                    )}
                  </div>
                )}

                {/* Final Settle Actions */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleSettleBill(false)}
                    disabled={actionLoading || (cartItems.length === 0 && !runningOrder)}
                    className="flex-1 bg-[#ff5722] hover:bg-[#e04c1d] disabled:opacity-50 text-white text-xs font-black py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer uppercase"
                  >
                    <Printer className="w-4 h-4" />
                    <span>PAY & PRINT (Enter)</span>
                  </button>

                  <button
                    onClick={() => handleSettleBill(true)}
                    disabled={actionLoading || (cartItems.length === 0 && !runningOrder)}
                    title="Pay & WhatsApp Bill"
                    className="px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TABLE VIEW (FLOOR PLAN) */}
      {posViewMode === "floor_plan" && (
        <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Today's Revenue</span>
                <h3 className="text-lg font-black text-slate-900">₹{todayLiveStats.totalRevenue.toLocaleString("en-IN")}</h3>
                <span className="text-[9px] text-slate-400 font-semibold block">{todayLiveStats.paidCount} Bills Settled</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Dining Tables</span>
                <h3 className="text-lg font-black text-slate-900">{todayLiveStats.occupiedCount} / {tables.length}</h3>
                <span className="text-[9px] text-emerald-600 font-bold block">{todayLiveStats.freeCount} Available Free</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setShowKOTModal(true)}
              className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
            >
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Kitchen (KDS)</span>
                <h3 className="text-lg font-black text-amber-800">{todayLiveStats.cookingCount} Cooking</h3>
                <span className="text-[9px] text-slate-400 font-semibold block">Active KOT Tickets</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Today's Orders</span>
                <h3 className="text-lg font-black text-slate-900">{todayLiveStats.totalOrdersToday} Placed</h3>
                <span className="text-[9px] text-slate-400 font-semibold block">{todayLiveStats.runningOrdersCount} Running Now</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setTableStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    tableStatusFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Tables ({tables.length})
                </button>

                <button
                  onClick={() => setTableStatusFilter("free")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    tableStatusFilter === "free"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Free ({todayLiveStats.freeCount})</span>
                </button>

                <button
                  onClick={() => setTableStatusFilter("occupied")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    tableStatusFilter === "occupied"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Occupied ({todayLiveStats.occupiedCount})</span>
                </button>

                <button
                  onClick={() => setTableStatusFilter("cooking")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    tableStatusFilter === "cooking"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Cooking ({todayLiveStats.cookingCount})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Find Table # or Name..."
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold pl-8 pr-6 py-1.5 rounded-xl focus:outline-none focus:border-[#ff5722]"
                  />
                  {tableSearchQuery && (
                    <button onClick={() => setTableSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() =>
                    setTableAddEditModal({
                      open: true,
                      mode: "add",
                      tableId: null,
                      tableNo: `Table ${tables.length + 1}`
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Table</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {filteredTables.length === 0 ? (
                <div className="py-24 text-center text-slate-400 text-xs font-semibold space-y-2">
                  <Coffee className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="text-sm font-black text-slate-700">No tables match your filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 content-start">
                  {filteredTables.map((table) => {
                    const orderOnTable = activeOrders.find(
                      (o) => (o.tableId === table.id || o.table?.id === table.id) && o.paymentStatus === "unpaid"
                    );
                    const tableTitle = formatTableTitle(table.tableNo);

                    let cardBg = "bg-white border-slate-200 hover:border-emerald-500 hover:shadow-xs";
                    let statusDot = "bg-emerald-500";

                    let durationMinutes = 0;
                    if (orderOnTable?.createdAt) {
                      const diffMs = Date.now() - new Date(orderOnTable.createdAt).getTime();
                      durationMinutes = Math.floor(diffMs / 60000);
                    }

                    if (orderOnTable) {
                      if (orderOnTable.status === "cooking" || orderOnTable.status === "pending") {
                        cardBg = "bg-amber-50/90 border-amber-300 hover:bg-amber-100 shadow-2xs";
                        statusDot = "bg-amber-500 animate-pulse";
                      } else {
                        cardBg = "bg-rose-50/70 border-rose-300 shadow-2xs";
                        statusDot = "bg-rose-500";
                      }
                    }

                    return (
                      <div
                        key={table.id}
                        onClick={() => handleSelectTable(table, true)}
                        className={`h-32 p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all duration-150 active:scale-96 group relative ${cardBg}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
                            <span className="text-xs font-black text-slate-900 group-hover:text-[#ff5722]">
                              {tableTitle}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenHistoryModal(table.tableNo);
                              }}
                              title="View Past Orders on this Table"
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                            >
                              <HistoryIcon className="w-3 h-3 text-orange-500" />
                            </button>

                            {orderOnTable && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferSourceTable(table);
                                  setShowTransferModal(true);
                                }}
                                title="Transfer Table"
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTableAddEditModal({
                                  open: true,
                                  mode: "edit",
                                  tableId: table.id,
                                  tableNo: table.tableNo
                                });
                              }}
                              title="Edit Table"
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        {orderOnTable ? (
                          <div className="my-auto space-y-0.5">
                            <div className="flex justify-between items-center">
                              <span className="text-base font-black text-slate-900 leading-tight">
                                ₹{Number(orderOnTable.totalAmount || 0)}
                              </span>
                              {durationMinutes > 0 && (
                                <span className="text-[9px] font-bold px-1 rounded bg-slate-200/80 text-slate-700 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {durationMinutes}m
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                              <span className="truncate">
                                {orderOnTable.customerName || "Dine-In"} • {orderOnTable.orderItems?.length || 0} Items
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="my-auto">
                            <span className="text-[11px] font-bold text-slate-400 block">4 Seats • Available</span>
                            <span className="text-[10px] text-emerald-600 font-bold block">Ready for Guest</span>
                          </div>
                        )}

                        <div className="text-[9px] font-black uppercase text-slate-500 group-hover:text-[#ff5722] pt-1.5 border-t border-black/5 flex justify-between items-center">
                          <span>{orderOnTable ? "Open Order" : "Start Order"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. QR ORDERS VIEW */}
      {posViewMode === "qr_orders" && (
        <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
          <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-0 overflow-hidden space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setQrFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    qrFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  All ({qrOrdersList.length})
                </button>
                <button
                  onClick={() => setQrFilter("pending")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1 ${
                    qrFilter === "pending" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  <span>Pending ({pendingQrCount})</span>
                </button>
              </div>

              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find Table or Name..."
                  value={qrSearchQuery}
                  onChange={(e) => setQrSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold pl-8 pr-6 py-1.5 rounded-xl focus:outline-none focus:border-[#ff5722]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {filteredQrOrders.length === 0 ? (
                <div className="py-24 text-center text-slate-400 text-xs font-bold">
                  <Smartphone className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p>No active QR orders right now</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
                  {filteredQrOrders.map((ord) => {
                    const isPending = ord.status === "pending";
                    const tableTitle = ord.table?.tableNo ? formatTableTitle(ord.table.tableNo) : "Takeaway QR";

                    return (
                      <div
                        key={ord.id}
                        className={`rounded-2xl border p-3 flex flex-col justify-between space-y-2.5 shadow-2xs ${
                          isPending ? "bg-rose-50/40 border-rose-200 ring-2 ring-rose-400/50" : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                          <div>
                            <span className="text-xs font-black text-slate-900 block">{tableTitle} • #{ord.receiptNo || ord.id}</span>
                            <span className="text-[10px] text-slate-500">{ord.customerName || "Guest"}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800">
                            {ord.status}
                          </span>
                        </div>

                        <div className="space-y-1 py-1 max-h-32 overflow-y-auto scrollbar-thin text-xs">
                          {ord.orderItems?.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between">
                              <span className="font-bold text-slate-900">{it.menuItem?.name || "Dish"} x{it.qty}</span>
                              <span className="font-black text-slate-900">₹{(it.price || 0) * it.qty}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs font-black">
                          <span className="text-slate-400 uppercase text-[10px]">Total</span>
                          <span className="text-sm text-[#ff5722]">₹{Number(ord.totalAmount || 0)}</span>
                        </div>

                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              if (ord.table) {
                                handleSelectTable(ord.table, true);
                              } else {
                                setRunningOrder(ord);
                                setCartItems(
                                  (ord.orderItems || []).map((it: any) => ({
                                    menuItemId: it.menuItemId,
                                    name: it.menuItem?.name || "Dish Item",
                                    price: Number(it.price || 0),
                                    qty: it.qty,
                                    isExisting: true
                                  }))
                                );
                                setPosViewMode("billing_terminal");
                              }
                            }}
                            className="flex-1 bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black py-2 rounded-xl cursor-pointer"
                          >
                            Bill Now
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. ALL ESSENTIAL MODALS */}

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#ff5722]" /> Customer Details
              </h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Customer Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff5722]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Mobile / WhatsApp No:</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff5722]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setCustomerName("");
                  setCustomerPhone("");
                  setShowCustomerModal(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  triggerToast("Customer saved to bill", "success");
                }}
                className="flex-1 bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black py-2 rounded-xl cursor-pointer"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCOUNT MODAL */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-xs w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#ff5722]" /> Apply Discount
              </h3>
              <button onClick={() => setShowDiscountModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    setDiscountType("percent");
                    setDiscountVal(pct);
                  }}
                  className={`py-2 rounded-xl text-xs font-black border cursor-pointer transition ${
                    discountType === "percent" && discountVal === pct
                      ? "bg-[#ff5722] border-[#ff5722] text-white"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {pct === 0 ? "None" : `${pct}%`}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Custom Flat Amount (₹):</label>
              <input
                type="number"
                placeholder="e.g. 50"
                value={discountType === "fixed" && discountVal > 0 ? discountVal : ""}
                onChange={(e) => {
                  setDiscountType("fixed");
                  setDiscountVal(Math.max(0, parseFloat(e.target.value) || 0));
                }}
                className="w-full p-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff5722]"
              />
            </div>

            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => {
                  setDiscountVal(0);
                  setShowDiscountModal(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setShowDiscountModal(false);
                  triggerToast(`Discount of ₹${discountAmount} applied`, "success");
                }}
                className="flex-1 bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black py-2 rounded-xl cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT PAYMENT MODAL */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Split className="w-4 h-4 text-[#ff5722]" /> Split Settlement
              </h3>
              <button onClick={() => setShowSplitModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border flex justify-between text-xs font-black">
              <span>Total Payable:</span>
              <span className="text-[#ff5722] text-sm">₹{grandTotal}</span>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Cash Amount (₹):</label>
                <input
                  type="number"
                  placeholder="0"
                  value={splitCashAmount}
                  onChange={(e) => {
                    const cash = parseFloat(e.target.value) || 0;
                    setSplitCashAmount(e.target.value);
                    setSplitOnlineAmount(String(Math.max(0, grandTotal - cash)));
                  }}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff5722]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">UPI / Card Amount (₹):</label>
                <input
                  type="number"
                  placeholder="0"
                  value={splitOnlineAmount}
                  onChange={(e) => setSplitOnlineAmount(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff5722]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSplitModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPaymentMethod("split");
                  setShowSplitModal(false);
                  triggerToast("Split payment configured", "success");
                }}
                className="flex-1 bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black py-2 rounded-xl cursor-pointer"
              >
                Confirm Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS CHEAT SHEET */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">⌨️ POS Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcutsModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              {[
                { key: "F2", action: "Focus Dish Search Bar" },
                { key: "F4", action: "Toggle Table View / Terminal" },
                { key: "F5", action: "Kitchen Tickets (KOT)" },
                { key: "F6", action: "Parked / Held Bills" },
                { key: "F7", action: "Quick Calculator" },
                { key: "F8", action: "Select Cash Payment" },
                { key: "F9", action: "Select UPI Payment" },
                { key: "F10", action: "Select Card Payment" },
                { key: "Enter", action: "Pay & Print Settlement" },
                { key: "Esc", action: "Close any modal" }
              ].map((sc) => (
                <div key={sc.key} className="flex justify-between items-center p-1.5 rounded-lg bg-slate-50">
                  <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-black text-slate-900 shadow-2xs">
                    {sc.key}
                  </kbd>
                  <span className="text-slate-600 font-semibold">{sc.action}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full bg-slate-900 text-white text-xs font-black py-2 rounded-xl cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* CUSTOMIZE / VARIATION MODAL */}
      {variationModal.open && variationModal.dish && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight">{variationModal.dish.name}</h3>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Base Price: ₹{Number(variationModal.dish.price).toLocaleString("en-IN")}
                </span>
              </div>
              <button
                onClick={() =>
                  setVariationModal({
                    open: false,
                    dish: null,
                    quantity: 1,
                    selectedVariation: { name: "Regular", priceDelta: 0 },
                    selectedAddons: [],
                    spice: "Normal",
                    note: ""
                  })
                }
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              {/* Portion / Variation */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Portion Size:</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(Array.isArray(variationModal.dish.variants) && variationModal.dish.variants.length > 0
                    ? variationModal.dish.variants.map((v: any) => ({
                        name: v.name,
                        priceDelta: Number(v.price) - Number(variationModal.dish.price),
                        variantId: v.id
                      }))
                    : [
                        { name: "Regular", priceDelta: 0, variantId: null },
                        { name: "Half", priceDelta: -Math.round(variationModal.dish.price * 0.3), variantId: null },
                        { name: "Full / Large", priceDelta: Math.round(variationModal.dish.price * 0.5), variantId: null }
                      ]
                  ).map((v: any) => {
                    const isSelected = variationModal.selectedVariation.name === v.name;
                    return (
                      <button
                        key={v.name}
                        onClick={() => setVariationModal((prev) => ({ ...prev, selectedVariation: v }))}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white font-black shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                        }`}
                      >
                        <span className="text-xs">{v.name}</span>
                        <span className="text-[9px] opacity-80">
                          {v.priceDelta === 0 ? "Standard" : v.priceDelta > 0 ? `+₹${v.priceDelta}` : `-₹${Math.abs(v.priceDelta)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spice Level */}
              {variationModal.dish.allowSpice !== false && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Spice Level:</label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { key: "Mild", label: "Mild", icon: <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> },
                      { key: "Normal", label: "Normal", icon: <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> },
                      { key: "Spicy", label: "Spicy", icon: <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" /> },
                      { key: "Extra", label: "Extra", icon: <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" /> }
                    ].map((sp) => {
                      const isSelected = variationModal.spice === sp.key;
                      return (
                        <button
                          key={sp.key}
                          onClick={() => setVariationModal((prev) => ({ ...prev, spice: sp.key }))}
                          className={`py-1.5 px-2 rounded-xl border text-center cursor-pointer transition flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? "bg-[#ff5722] border-[#ff5722] text-white font-black shadow-xs"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                          }`}
                        >
                          {isSelected ? (
                            <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                          ) : (
                            sp.icon
                          )}
                          <span className="text-xs">{sp.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extra Addons */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Add-ons (Optional):</label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {(Array.isArray(variationModal.dish.addons) && variationModal.dish.addons.length > 0
                    ? variationModal.dish.addons.map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        price: Number(a.price)
                      }))
                    : [
                        { name: "Extra Cheese", price: 30 },
                        { name: "Extra Sauce / Dip", price: 20 },
                        { name: "Butter Layer", price: 15 },
                        { name: "Fried Onions", price: 15 }
                      ]
                  ).map((ad: any) => {
                    const isChecked = variationModal.selectedAddons.some((a) => a.name === ad.name);
                    return (
                      <button
                        key={ad.name}
                        onClick={() => {
                          setVariationModal((prev) => {
                            if (isChecked) {
                              return { ...prev, selectedAddons: prev.selectedAddons.filter((a) => a.name !== ad.name) };
                            } else {
                              return { ...prev, selectedAddons: [...prev.selectedAddons, ad] };
                            }
                          });
                        }}
                        className={`p-2 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-black"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
                        }`}
                      >
                        <span className="text-[11px]">{ad.name}</span>
                        <span className="text-[10px] font-black">+₹{ad.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-700">Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVariationModal((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-black flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-black text-slate-900 min-w-6 text-center">
                    {variationModal.quantity}
                  </span>
                  <button
                    onClick={() => setVariationModal((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}
                    className="w-7 h-7 rounded-lg bg-[#ff5722] text-white font-black flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Special Note */}
              <input
                type="text"
                placeholder="Special note (e.g. Less spicy, Crispy, Extra gravy)..."
                value={variationModal.note}
                onChange={(e) => setVariationModal({ ...variationModal, note: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#ff5722] bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                onClick={() =>
                  setVariationModal({
                    open: false,
                    dish: null,
                    quantity: 1,
                    selectedVariation: { name: "Regular", priceDelta: 0 },
                    selectedAddons: [],
                    spice: "Normal",
                    note: ""
                  })
                }
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCustomization}
                className="flex-1 bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Add ({variationModal.quantity}x)</span>
                <span>•</span>
                <span>
                  ₹{Math.max(
                    0,
                    (Number(variationModal.dish.price) +
                      variationModal.selectedVariation.priceDelta +
                      variationModal.selectedAddons.reduce((s, a) => s + a.price, 0)) *
                      variationModal.quantity
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM NOTE MODAL */}
      {itemNoteModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-xs w-full rounded-2xl shadow-2xl p-4 space-y-3 animate-fade-in border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 truncate">
                <FileText className="w-3.5 h-3.5 text-[#ff5722]" />
                <h3 className="text-xs font-black text-slate-900 truncate">Note for {itemNoteModal.itemName}</h3>
              </div>
              <button onClick={() => setItemNoteModal({ ...itemNoteModal, open: false })} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {["Less spicy", "No onion", "No garlic", "Extra gravy", "Crispy"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setItemNoteModal({ ...itemNoteModal, note: preset })}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-[10px] font-bold text-slate-700 cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Custom instructions..."
              value={itemNoteModal.note}
              onChange={(e) => setItemNoteModal({ ...itemNoteModal, note: e.target.value })}
              className="w-full p-2 border rounded-xl text-xs font-semibold focus:outline-none focus:border-[#ff5722]"
              autoFocus
            />

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setItemNoteModal({ ...itemNoteModal, open: false })}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItemNote}
                className="flex-1 bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black py-1.5 rounded-xl cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELD BILLS MODAL */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Held / Parked Bills</h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {heldBills.length} temporarily parked orders
                  </span>
                </div>
              </div>

              <button onClick={() => setShowHeldModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 scrollbar-thin">
              {heldBills.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs font-semibold space-y-2">
                  <PauseCircle className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-black text-slate-700 text-sm">No parked bills</p>
                  <p className="text-[11px]">When taking an order, click "Hold" to park the bill temporarily.</p>
                </div>
              ) : (
                heldBills.map((held) => {
                  const tableTitle = held.selectedTable?.tableNo
                    ? formatTableTitle(held.selectedTable.tableNo)
                    : held.orderType === "takeaway"
                    ? "Takeaway"
                    : "Delivery";

                  return (
                    <div
                      key={held.id}
                      className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50/70 transition space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{tableTitle}</span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {held.customerName ? `• ${held.customerName}` : ""}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{held.timestamp}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700 py-1">
                        {held.cartItems?.map((it: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 font-semibold">
                            {it.name} <b className="text-slate-900">x{it.qty}</b> (₹{it.price * it.qty})
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                        <span className="font-black text-slate-900 text-sm">
                          Amount: <span className="text-[#ff5722]">₹{held.totalAmount || held.cartItems?.reduce((s: number, i: any) => s + i.price * i.qty, 0)}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteHeldBill(held.id)}
                            className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleRecallHeldBill(held)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#ff5722] hover:bg-[#e04c1d] text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Resume Bill</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowHeldModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff5722] flex items-center justify-center shadow-2xs">
                  <HistoryIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">Order History & Invoices</h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Real-time server records • {historyTotals.count} Orders found (₹{historyTotals.totalRev.toLocaleString("en-IN")} Net Paid)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchOrderHistoryFromApi(historyDateFilter, historyCustomDate)}
                  title="Refresh History from API"
                  className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer ${
                    historyLoading ? "animate-spin text-orange-600" : ""
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowHistoryModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Total Revenue</span>
                <span className="font-black text-slate-900 text-sm">₹{historyTotals.totalRev.toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Cash Sales</span>
                <span className="font-black text-emerald-700 text-sm">₹{historyTotals.cash.toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">UPI Sales</span>
                <span className="font-black text-indigo-700 text-sm">₹{historyTotals.upi.toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Card Sales</span>
                <span className="font-black text-sky-700 text-sm">₹{historyTotals.card.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-0.5">
                    <Calendar className="w-3 h-3" /> Date:
                  </span>
                  {(
                    [
                      { key: "today", label: "Today" },
                      { key: "yesterday", label: "Yesterday" },
                      { key: "last7days", label: "Last 7 Days" },
                      { key: "all", label: "All Time" },
                      { key: "custom", label: "Pick Date" }
                    ] as const
                  ).map((df) => (
                    <button
                      key={df.key}
                      onClick={() => {
                        setHistoryDateFilter(df.key);
                        fetchOrderHistoryFromApi(df.key, historyCustomDate);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                        historyDateFilter === df.key
                          ? "bg-[#ff5722] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {df.label}
                    </button>
                  ))}
                </div>

                {historyDateFilter === "custom" && (
                  <input
                    type="date"
                    value={historyCustomDate}
                    onChange={(e) => {
                      setHistoryCustomDate(e.target.value);
                      fetchOrderHistoryFromApi("custom", e.target.value);
                    }}
                    className="p-1 px-2 border rounded-xl text-xs font-bold bg-white"
                  />
                )}

                <div className="relative w-48 sm:w-56">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search receipt, table, name..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold pl-7 pr-6 py-1 rounded-xl focus:outline-none focus:border-[#ff5722]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 scrollbar-thin">
              {historyLoading ? (
                <div className="py-20 text-center text-slate-400 text-xs font-semibold space-y-2">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-orange-500" />
                  <p>Fetching real order data from server...</p>
                </div>
              ) : filteredHistoryModalOrders.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs font-semibold space-y-2">
                  <HistoryIcon className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-black text-slate-700 text-sm">No orders found</p>
                </div>
              ) : (
                filteredHistoryModalOrders.map((ord: any) => {
                  const isPaid = ord.paymentStatus === "paid";
                  const formattedTable = ord.table?.tableNo ? formatTableTitle(ord.table.tableNo) : ord.orderType === "takeaway" ? "Takeaway" : "Delivery";

                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs transition-all space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">#{ord.receiptNo || ord.id}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-black text-[10px]">
                            {formattedTable}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {ord.customerName ? `• ${ord.customerName}` : ""}
                            {ord.customerPhone ? ` (${ord.customerPhone})` : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-800"
                                : ord.status === "cooking"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isPaid ? `PAID (${ord.paymentMethod?.toUpperCase() || "CASH"})` : ord.status?.toUpperCase() || "UNPAID"}
                          </span>

                          <span className="text-[11px] text-slate-400 font-semibold">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700 py-1">
                        {ord.orderItems?.map((it: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 font-semibold">
                            {it.menuItem?.name || "Dish"} <b className="text-slate-900">x{it.qty}</b> (₹{(it.price || 0) * it.qty})
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                        <span className="font-black text-slate-900 text-sm">
                          Total: <span className="text-[#ff5722]">₹{Number(ord.totalAmount || 0).toLocaleString("en-IN")}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isPaid && (
                            <button
                              onClick={() => {
                                const ordData = {
                                  id: ord.id,
                                  receiptNo: ord.receiptNo || `REC-${ord.id}`,
                                  table: ord.table,
                                  orderType: ord.orderType,
                                  items: ord.orderItems?.map((it: any) => ({
                                    name: it.menuItem?.name || it.nameSnapshot || "Dish Item",
                                    price: Number(it.price || 0),
                                    qty: it.qty,
                                    spice: it.spiceLevel,
                                    notes: it.notes
                                  })),
                                  totalAmount: Number(ord.totalAmount || 0),
                                  paymentMethod: ord.paymentMethod || "cash",
                                  createdAt: ord.createdAt
                                };
                                setLastCompletedOrder(ordData);
                                printThermalReceipt(ordData);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Printer className="w-3 h-3 text-orange-400" />
                              <span>80mm Receipt</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              handleShareWhatsApp({
                                id: ord.id,
                                receiptNo: ord.receiptNo || ord.id,
                                table: ord.table,
                                customerPhone: ord.customerPhone,
                                items: ord.orderItems?.map((it: any) => ({
                                  name: it.menuItem?.name || "Dish Item",
                                  price: Number(it.price || 0),
                                  qty: it.qty
                                })),
                                totalAmount: Number(ord.totalAmount || 0),
                                paymentMethod: ord.paymentMethod || "cash"
                              });
                            }}
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                            title="Send WhatsApp Bill"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KOT TICKETS MODAL */}
      {showKOTModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-5 space-y-3 animate-fade-in border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-amber-600" />
                <span>Kitchen Tickets ({todayLiveStats.cookingCount})</span>
              </h3>
              <button onClick={() => setShowKOTModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 scrollbar-thin">
              {activeOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">No active kitchen tickets right now.</p>
              ) : (
                activeOrders.map((ord) => (
                  <div key={ord.id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900">
                        #{ord.receiptNo || ord.id} • {ord.table?.tableNo ? formatTableTitle(ord.table.tableNo) : "Takeaway"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-900">
                        {ord.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 space-y-0.5 pl-2 border-l-2 border-amber-300">
                      {ord.orderItems?.map((it: any) => (
                        <div key={it.id} className="flex justify-between">
                          <span>• {it.menuItem?.name || "Dish"} x{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 80MM RECEIPT MODAL */}
      {showReceiptModal && lastCompletedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-fade-in flex flex-col max-h-[92vh]">
            <div className="bg-emerald-600 px-4 py-2.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <h4 className="text-xs font-black uppercase">Payment Complete</h4>
              </div>
              <span className="text-sm font-black">₹{lastCompletedOrder.totalAmount}</span>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 space-y-3 font-mono text-[11px] text-slate-800 scrollbar-thin">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                  <h3 className="font-black text-sm text-slate-900 uppercase">
                    {restaurant?.name || "RESTUVEXO RESTAURANT"}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-sans">Tax Invoice</p>
                </div>

                <div className="text-[10px] text-slate-600 space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span>Invoice: #{lastCompletedOrder.receiptNo}</span>
                    <span>{new Date(lastCompletedOrder.createdAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Table: {lastCompletedOrder.table?.tableNo ? formatTableTitle(lastCompletedOrder.table.tableNo) : "Takeaway"}</span>
                    <span>{lastCompletedOrder.paymentMethod?.toUpperCase()}</span>
                  </div>
                </div>

                <div className="space-y-1 pb-2 border-b border-dashed border-slate-300">
                  {lastCompletedOrder.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-start text-[11px]">
                      <span className="font-bold text-slate-900">{it.name} x{it.qty}</span>
                      <span className="font-black text-slate-900">₹{it.price * it.qty}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-xs font-black text-slate-900 pt-1">
                    <span>TOTAL PAID</span>
                    <span className="text-sm text-[#ff5722]">₹{Number(lastCompletedOrder.totalAmount).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-100 space-y-1.5 shrink-0">
              <button
                onClick={() => printThermalReceipt(lastCompletedOrder)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-orange-400" />
                <span>Print Receipt (80mm)</span>
              </button>

              <button
                onClick={() => handleShareWhatsApp(lastCompletedOrder)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send WhatsApp Bill</span>
              </button>

              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-xl cursor-pointer"
              >
                + Next Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-xl shadow-lg text-xs font-black text-white flex items-center gap-2 animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
              ? "bg-rose-600"
              : "bg-slate-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}

export default function PosTerminal() {
  return (
    <Suspense fallback={null}>
      <PosContent />
    </Suspense>
  );
}
