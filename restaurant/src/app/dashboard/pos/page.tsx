"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { io } from "socket.io-client";

export default function PosTerminal() {
  const [user, setUser] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Checkboxes for merging
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // Search filter for left list
  const [searchQuery, setSearchQuery] = useState("");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal controls
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [discountApprovedBy, setDiscountApprovedBy] = useState("");

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitQuantities, setSplitQuantities] = useState<{ [key: number]: number }>({});

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetTableId, setTargetTableId] = useState("");

  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidApprovedBy, setVoidApprovedBy] = useState("");
  const [managerPin, setManagerPin] = useState("");

  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [orderLogs, setOrderLogs] = useState<any[]>([]);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [printedOrder, setPrintedOrder] = useState<any | null>(null);

  // Split payment inputs
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitPayments, setSplitPayments] = useState([
    { method: "cash", amount: "" },
    { method: "upi", amount: "" },
    { method: "card", amount: "" }
  ]);
  const [isSplitPaymentActive, setIsSplitPaymentActive] = useState(false);

  // Custom Toast state
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const triggerToast = (message: string, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  const fetchActiveOrders = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/order`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        // Show active unpaid orders that aren't merged away
        const unpaid = (json.data || []).filter((o: any) => o.paymentStatus === "unpaid" && !o.isMerged);
        setActiveOrders(unpaid);
        
        // Keep selected order synced
        if (selectedOrder) {
          const freshSelected = unpaid.find((o: any) => o.id === selectedOrder.id);
          setSelectedOrder(freshSelected || null);
        }
      }
    } catch (e) {
      console.error("Failed to fetch active orders:", e);
    }
  };

  const fetchPosParameters = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      window.location.href = "/auth/login";
      return;
    }
    try {
      const tablesRes = await fetch(`${BACKEND_URL}/api/tables`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (tablesRes.status === 401) {
        localStorage.clear();
        window.location.href = "/auth/login";
        return;
      }
      if (tablesRes.ok) {
        const tablesJson = await tablesRes.json();
        setTables(tablesJson);
      }
      await fetchActiveOrders();
    } catch (err) {
      console.error("Error loading POS configs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {
      console.error("Error parsing user profile:", e);
    }

    fetchPosParameters();

    // Register WebSockets for real-time synchronization
    const socket = io(BACKEND_URL);
    try {
      const storedUser = localStorage.getItem("user");
      const restStr = localStorage.getItem("restaurant");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        let restaurantId = parsed.restaurantId;
        if (!restaurantId && restStr) {
          const rest = JSON.parse(restStr);
          if (rest) restaurantId = rest.id;
        }
        if (restaurantId) socket.emit("join_restaurant", restaurantId);
      }
    } catch (e) {
      console.error("Error parsing restaurant config for socket registration:", e);
    }

    socket.on("new_order_placed", () => fetchActiveOrders());
    socket.on("order_updated", () => fetchActiveOrders());
    socket.on("order_payment_settled", () => fetchActiveOrders());
    socket.on("table_updated", () => fetchActiveOrders());

    return () => {
      socket.disconnect();
    };
  }, [BACKEND_URL]);

  useEffect(() => {
    if (typeof window !== "undefined" && activeOrders.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const orderIdParam = params.get("orderId");
      if (orderIdParam) {
        const matched = activeOrders.find((o: any) => o.id.toString() === orderIdParam);
        if (matched) {
          setSelectedOrder(matched);
          setSelectedOrderIds([]);
          // Clean the query parameters from the URL safely without reloading
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    }
  }, [activeOrders]);

  const selectActiveOrder = (order: any) => {
    setSelectedOrder(order);
    setSelectedOrderIds([]); // Clear merge selections
  };

  const handleOrderCheckboxChange = (orderId: number) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleMergeOrders = async () => {
    if (selectedOrderIds.length < 2) return;
    setActionLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/order/merge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orderIds: selectedOrderIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Merge failed.");
      
      triggerToast("Orders merged successfully!", "success");
      setSelectedOrderIds([]);
      setSelectedOrder(data.order);
      await fetchActiveOrders();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/order/${selectedOrder.id}/discount`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          percentage: discountPercent,
          approvedBy: discountApprovedBy || "Manager",
          reason: discountReason || "General Override"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discount failed.");
      
      triggerToast("Discount override applied successfully!", "success");
      setShowDiscountModal(false);
      setDiscountPercent(0);
      setDiscountApprovedBy("");
      setDiscountReason("");
      setSelectedOrder(data.order);
      await fetchActiveOrders();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSplitOrder = async () => {
    if (!selectedOrder) return;
    const splitPayload = Object.entries(splitQuantities)
      .map(([itemId, qty]) => ({ menuItemId: parseInt(itemId), qty }))
      .filter(i => i.qty > 0);

    if (splitPayload.length === 0) {
      triggerToast("Select quantities to split off.", "error");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/order/${selectedOrder.id}/split`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ items: splitPayload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Split failed.");

      triggerToast("Order split successfully!", "success");
      setShowSplitModal(false);
      setSplitQuantities({});
      setSelectedOrder(data.order);
      await fetchActiveOrders();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveTable = async () => {
    if (!selectedOrder || !targetTableId) return;
    
    // Check conflicts
    const targetTable = tables.find(t => t.id.toString() === targetTableId);
    const hasActiveOrders = activeOrders.some(o => o.tableId === parseInt(targetTableId));

    if (hasActiveOrders) {
      const proceed = confirm(`Table ${targetTable?.tableNo || targetTableId} already has active orders on it. Do you want to continue?`);
      if (!proceed) return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/order/${selectedOrder.id}/move-table`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ targetTableId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Table move failed.");

      triggerToast("Relocated table successfully!", "success");
      setShowMoveModal(false);
      setTargetTableId("");
      setSelectedOrder(data.order);
      await fetchActiveOrders();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoidOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (managerPin !== "0000" && managerPin !== "1234") {
      triggerToast("Invalid Manager PIN override.", "error");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/order/${selectedOrder.id}/void`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: voidReason || "Void override",
          approvedBy: voidApprovedBy || "Manager"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Void failed.");

      triggerToast("Order voided/cancelled successfully!", "success");
      setShowVoidModal(false);
      setVoidReason("");
      setVoidApprovedBy("");
      setManagerPin("");
      setSelectedOrder(null);
      await fetchActiveOrders();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchTimelineLogs = async () => {
    if (!selectedOrder) return;
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/order/${selectedOrder.id}/logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrderLogs(data.logs || []);
        setShowTimelineModal(true);
      }
    } catch (err) {
      console.error("Timeline logs load failed:", err);
    }
  };

  const handleSettlePayment = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    const token = localStorage.getItem("authToken");

    let payload: any = {};
    if (isSplitPaymentActive) {
      const validPayments = splitPayments
        .map(p => ({ method: p.method, amount: parseFloat(p.amount) || 0 }))
        .filter(p => p.amount > 0);
      
      const totalEntered = validPayments.reduce((sum, p) => sum + p.amount, 0);
      const payableAmount = parseFloat(selectedOrder.totalAmount || selectedOrder.totalAmount?.toString() || "0");
      if (Math.abs(totalEntered - payableAmount) > 0.01) {
        triggerToast(`Split payment amounts (₹${totalEntered.toFixed(2)}) must equal Total Payable (₹${payableAmount.toFixed(2)}).`, "error");
        setActionLoading(false);
        return;
      }
      payload.payments = validPayments;
    } else {
      payload.paymentMethod = paymentMethod;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/order/${selectedOrder.id}/settle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment settle failed.");

      triggerToast("Invoice generated and order completed!", "success");
      setPrintedOrder(data.order);
      setShowReceiptModal(true);
      setSelectedOrder(null);
      await fetchActiveOrders();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReprintReceipt = async () => {
    if (!printedOrder) return;
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/order/${printedOrder.id}/reprint`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrintedOrder((prev: any) => ({ ...prev, printCount: data.printCount }));
        triggerToast("Reprint audit log entry recorded.", "success");
      }
    } catch (err) {
      console.error("Reprint count log failed:", err);
    }
  };

  const handleRedirectToEdit = () => {
    if (!selectedOrder) return;
    localStorage.setItem("editOrderId", selectedOrder.id.toString());
    localStorage.setItem("editOrderTable", selectedOrder.tableId?.toString() || "");
    localStorage.setItem("editOrderType", selectedOrder.orderType);
    localStorage.setItem("editOrderDiscount", selectedOrder.discountApplied?.toString() || "0");
    localStorage.setItem("editOrderItems", JSON.stringify(selectedOrder.orderItems));
    
    window.location.href = "/dashboard/orders/create";
  };

  // Group active orders by dining tables
  const tablesWithOrders: { [key: string]: any[] } = {};
  const takeawayOrders: any[] = [];

  activeOrders.forEach(order => {
    if (order.orderType === "dine_in" && order.table) {
      const tableNo = order.table.tableNo;
      if (!tablesWithOrders[tableNo]) tablesWithOrders[tableNo] = [];
      tablesWithOrders[tableNo].push(order);
    } else {
      takeawayOrders.push(order);
    }
  });

  if (loading) {
    return <LoadingScreen message="Syncing POS Billing Terminals..." minHeight="60vh" />;
  }

  return (
    <div className="space-y-6 text-slate-800 relative pb-10">
      
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

      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className={`border px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3.5 min-w-[290px] max-w-sm bg-slate-900 border-slate-700 text-slate-100`}>
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

      {actionLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm select-none">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#ff5722] animate-spin" />
          </div>
          <h2 className="text-slate-900 font-black text-lg tracking-tight mb-1">Processing Settle Ticket</h2>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Active Orders Queue grouped by Table */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-slate-900 font-black text-base tracking-tight">Active Dining Orders</h3>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5">Settle receipts, manage split options, and track table groups</p>
              </div>

              {selectedOrderIds.length >= 2 && (
                <button
                  onClick={handleMergeOrders}
                  className="bg-[#ff5722] hover:bg-[#e64a19] text-white text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-md shadow-orange-500/20"
                >
                  Merge Selected ({selectedOrderIds.length})
                </button>
              )}
            </div>

            {activeOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-300 font-bold uppercase tracking-widest text-xs">
                No active orders found in the queue.
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Dining Tables Groups */}
                {Object.entries(tablesWithOrders).map(([tableNo, orders]) => (
                  <div key={tableNo} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="text-slate-900 font-black text-xs uppercase tracking-wider">{tableNo} ({orders.length} Active)</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {orders.map((o) => (
                        <div 
                          key={o.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                            selectedOrder?.id === o.id
                              ? "bg-[#ff5722]/5 border-[#ff5722]/20 shadow-md"
                              : "bg-white border-slate-100 hover:shadow-md"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={selectedOrderIds.includes(o.id)}
                                  onChange={() => handleOrderCheckboxChange(o.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3.5 h-3.5 accent-[#ff5722] border-slate-350 rounded focus:ring-0 focus:outline-none"
                                />
                                <span className="text-xs font-black text-slate-900 hover:text-[#ff5722] transition-colors">
                                  #{o.id} ({o.orderType.toUpperCase()})
                                </span>
                              </label>
                              <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                o.status === "ready" 
                                  ? "bg-emerald-100 text-emerald-600"
                                  : o.status === "cooking"
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-slate-100 text-slate-500"
                              }`}>
                                {o.status}
                              </span>
                            </div>
                            
                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                              {(o.orderItems || []).map((oi: any) => `${oi.menuItem?.name || oi.name} x${oi.qty}`).join(', ')}
                            </p>
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                            <span className="text-slate-900 font-black text-xs">₹{parseFloat(o.totalAmount).toFixed(2)}</span>
                            <button
                              onClick={() => selectActiveOrder(o)}
                              className="text-[9px] uppercase tracking-widest font-black text-[#ff5722] bg-orange-50 hover:bg-[#ff5722] hover:text-white px-3.5 py-2 rounded-lg transition-all"
                            >
                              Settle Bill
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Takeaway / Delivery list */}
                {takeawayOrders.length > 0 && (
                  <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                    <h4 className="text-slate-900 font-black text-xs uppercase tracking-wider">Takeaway / Delivery ({takeawayOrders.length} Active)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {takeawayOrders.map((o) => (
                        <div 
                          key={o.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                            selectedOrder?.id === o.id
                              ? "bg-[#ff5722]/5 border-[#ff5722]/20 shadow-md"
                              : "bg-white border-slate-100 hover:shadow-md"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={selectedOrderIds.includes(o.id)}
                                  onChange={() => handleOrderCheckboxChange(o.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3.5 h-3.5 accent-[#ff5722] border-slate-350 rounded focus:ring-0 focus:outline-none"
                                />
                                <span className="text-xs font-black text-slate-900">
                                  #{o.id} ({o.orderType.toUpperCase()})
                                </span>
                              </label>
                              <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                o.status === "ready" 
                                  ? "bg-emerald-100 text-emerald-600"
                                  : o.status === "cooking"
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-slate-100 text-slate-500"
                              }`}>
                                {o.status}
                              </span>
                            </div>
                            
                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                              {(o.orderItems || []).map((oi: any) => `${oi.menuItem?.name || oi.name} x${oi.qty}`).join(', ')}
                            </p>
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                            <span className="text-slate-900 font-black text-xs">₹{parseFloat(o.totalAmount).toFixed(2)}</span>
                            <button
                              onClick={() => selectActiveOrder(o)}
                              className="text-[9px] uppercase tracking-widest font-black text-[#ff5722] bg-orange-50 hover:bg-[#ff5722] hover:text-white px-3.5 py-2 rounded-lg transition-all"
                            >
                              Settle Bill
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

        {/* Right Side: Cashier Billing Panel */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm sticky top-6 space-y-6 max-h-[calc(100vh-3.5rem)] overflow-y-auto custom-scroll">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-slate-900 font-black text-sm tracking-tight">Settle Active Order</h3>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5">Billing & settle override terminal</p>
          </div>

          {!selectedOrder ? (
            <div className="py-16 text-center text-slate-300 font-black uppercase tracking-widest text-[11px] leading-relaxed">
              Select an active order card from the queue list to settle bill
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Order Metadata details */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Order ID</span>
                  <span className="text-slate-900 font-black">#{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Table Location</span>
                  <span className="text-slate-900 font-black">{selectedOrder.table?.tableNo || "None (Takeaway)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Kitchen Status</span>
                  <span className="text-slate-900 font-black uppercase">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Date & Time</span>
                  <span className="text-slate-900 font-black">{new Date(selectedOrder.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRedirectToEdit}
                  className="bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  Edit Order / KOT
                </button>
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="bg-slate-50 border border-slate-150 hover:bg-slate-100 text-[#ff5722] text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  Override Disc
                </button>
                <button
                  onClick={() => {
                    // Prepopulate splitQuantities with 0
                    const initial: { [key: number]: number } = {};
                    selectedOrder.orderItems.forEach((item: any) => {
                      initial[item.menuItemId] = 0;
                    });
                    setSplitQuantities(initial);
                    setShowSplitModal(true);
                  }}
                  className="bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  Split Order
                </button>
                <button
                  onClick={() => setShowMoveModal(true)}
                  className="bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  Move Table
                </button>
                <button
                  onClick={fetchTimelineLogs}
                  className="bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  Order Timeline
                </button>
                <button
                  onClick={() => setShowVoidModal(true)}
                  className="bg-slate-50 border border-slate-150 hover:bg-rose-50 hover:text-rose-600 text-rose-500 text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  Void Order
                </button>
              </div>

              {/* Settle Itemized list */}
              <div className="space-y-3.5 border-t border-b border-slate-100 py-4 max-h-[220px] overflow-y-auto pr-1">
                {(selectedOrder.orderItems || []).map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-bold truncate leading-snug">{item.menuItem?.name || item.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">x{item.qty} Qty @ ₹{parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <span className="text-slate-900 font-black pl-4">₹{(parseFloat(item.price) * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Total calculations */}
              <div className="space-y-2 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-900">₹{parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(selectedOrder.discountApplied) > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount</span>
                    <span>-₹{parseFloat(selectedOrder.discountApplied).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-black border-t border-dashed border-slate-100 pt-2.5 text-sm uppercase tracking-wide">
                  <span>Grand Total</span>
                  <span>₹{parseFloat(selectedOrder.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Settle payment choices */}
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Type</span>
                  <button
                    onClick={() => setIsSplitPaymentActive(prev => !prev)}
                    className="text-[9px] uppercase tracking-widest font-black text-[#ff5722] bg-orange-50 px-3 py-1.5 rounded-lg"
                  >
                    {isSplitPaymentActive ? "Single Method" : "Split Payments"}
                  </button>
                </div>

                {!isSplitPaymentActive ? (
                  <div className="grid grid-cols-3 gap-2">
                    {["cash", "upi", "card"].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                          paymentMethod === method
                            ? "bg-slate-900 text-white border-transparent"
                            : "bg-slate-50 text-slate-450 border-slate-150 hover:bg-slate-100"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    {splitPayments.map((p, idx) => (
                      <div key={p.method} className="flex items-center justify-between gap-4">
                        <span className="text-[10px] uppercase font-black text-slate-500 w-12">{p.method}</span>
                        <input
                          type="number"
                          placeholder="₹ Amount"
                          value={p.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSplitPayments(prev => 
                              prev.map((item, i) => i === idx ? { ...item, amount: val } : item)
                            );
                          }}
                          className="bg-white border border-slate-200 rounded-lg text-xs p-1.5 w-full text-right focus:outline-none focus:border-[#ff5722]/50 font-black text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleSettlePayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                >
                  Settle & Generate Invoice
                </button>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* ========================================================
          MODAL: DISCOUNT OVERRIDE
          ======================================================== */}
      {showDiscountModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-250 p-6.5 rounded-[2.5rem] w-full max-w-sm space-y-4 shadow-2xl animate-scale-up text-slate-900">
            <div className="text-center space-y-1">
              <h4 className="font-black text-slate-900 text-lg">Override Discount</h4>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Modify pricing matrix parameters. Protected audit trail will trace approvals.</p>
            </div>
            
            <form onSubmit={handleApplyDiscount} className="space-y-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Discount Percentage (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full text-center text-xl font-black py-3 border border-slate-200 rounded-2xl focus:border-slate-900 bg-slate-50 text-slate-950"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Authorized By</label>
                <input
                  type="text"
                  placeholder="Manager / Owner Name"
                  value={discountApprovedBy}
                  onChange={(e) => setDiscountApprovedBy(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 bg-slate-50 text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Override Reason</label>
                <input
                  type="text"
                  placeholder="Loyalty discount, food delay, etc."
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 bg-slate-50 text-slate-900 font-medium"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-2xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs transition"
                >
                  Apply Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SPLIT BILL ITEMS
          ======================================================== */}
      {showSplitModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-250 p-6.5 rounded-[2.5rem] w-full max-w-md space-y-4 shadow-2xl animate-scale-up text-slate-900">
            <div className="text-center space-y-1">
              <h4 className="font-black text-slate-900 text-lg">Split Order Bill</h4>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Choose quantities to separate into a new child order billing card.</p>
            </div>

            <div className="space-y-3.5 max-h-[250px] overflow-y-auto py-2 pr-1">
              {(selectedOrder.orderItems || []).map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                  <div className="flex-1 pr-4 font-bold">
                    <p className="text-slate-900">{item.menuItem?.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Available: {item.qty} Qty</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSplitQuantities(prev => ({
                        ...prev,
                        [item.menuItemId]: Math.max(0, (prev[item.menuItemId] || 0) - 1)
                      }))}
                      className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="text-xs font-black w-4 text-center">{splitQuantities[item.menuItemId] || 0}</span>
                    <button
                      onClick={() => setSplitQuantities(prev => ({
                        ...prev,
                        [item.menuItemId]: Math.min(item.qty, (prev[item.menuItemId] || 0) + 1)
                      }))}
                      className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-2xl text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSplitOrder}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs transition"
              >
                Create Split Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MOVE TABLE DROPDOWN
          ======================================================== */}
      {showMoveModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-250 p-6.5 rounded-[2.5rem] w-full max-w-sm space-y-4 shadow-2xl animate-scale-up text-slate-900">
            <div className="text-center space-y-1">
              <h4 className="font-black text-slate-900 text-lg">Relocate Table</h4>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Select destination table. Conflict detection maps check occupied slots.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1 text-xs font-bold">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Destination Dining Table</label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none text-slate-900"
                >
                  <option value="">Choose Table...</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id.toString()}>
                      {t.tableNo} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-2xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveTable}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs transition"
                >
                  Relocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: VOID ORDER OVERRIDE
          ======================================================== */}
      {showVoidModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-250 p-6.5 rounded-[2.5rem] w-full max-w-sm space-y-4 shadow-2xl animate-scale-up text-slate-900">
            <div className="text-center space-y-1">
              <h4 className="font-black text-rose-600 text-lg">Void/Cancel Order</h4>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Voiding cancels unpaid tickets. Action is protected by manager PIN logs.</p>
            </div>

            <form onSubmit={handleVoidOrder} className="space-y-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Manager Authorization PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="• • • •"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full tracking-[16px] text-center text-2xl font-black py-3 border border-slate-200 rounded-2xl focus:border-slate-900 bg-slate-50 text-slate-950"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Approved By</label>
                <input
                  type="text"
                  placeholder="Manager Name"
                  value={voidApprovedBy}
                  onChange={(e) => setVoidApprovedBy(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 bg-slate-50 text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Voiding Reason</label>
                <input
                  type="text"
                  placeholder="Customer left, incorrect items order, etc."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-900 bg-slate-50 text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoidModal(false)}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-2xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-2xl text-xs transition"
                >
                  Settle Void
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ORDER TIMELINE life-cycle logs stream
          ======================================================== */}
      {showTimelineModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-250 p-6.5 rounded-[2.5rem] w-full max-w-md space-y-4 shadow-2xl animate-scale-up text-slate-900">
            <div className="text-center space-y-1">
              <h4 className="font-black text-slate-900 text-base">Order Lifecycle Timeline</h4>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5">Chronological audit actions logs</p>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto py-3 pr-1 text-xs leading-relaxed">
              {orderLogs.length === 0 ? (
                <p className="text-center text-slate-350 font-bold uppercase tracking-widest py-8">No action logs found for this ticket.</p>
              ) : (
                <div className="relative border-l border-slate-150 ml-3 pl-4 space-y-4">
                  {orderLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#ff5722] border-2 border-white ring-2 ring-orange-100" />
                      <p className="text-[10px] text-slate-400 font-bold">{new Date(log.createdAt).toLocaleString()}</p>
                      <p className="text-slate-800 font-black uppercase text-[9px] tracking-wide mt-0.5">{log.action}</p>
                      <p className="text-slate-600 font-medium text-[11px] mt-0.5 leading-relaxed">{log.newValue}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowTimelineModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-2xl text-xs transition"
            >
              Close Timeline
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: HIGH-FIDELITY RECEIPT INVOICE PREVIEW
          ======================================================== */}
      {showReceiptModal && printedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-100 border border-slate-300 p-6.5 rounded-[2.5rem] w-full max-w-sm space-y-6 shadow-2xl relative text-slate-900 animate-scale-up">
            
            <div className="text-center space-y-1">
              <h4 className="font-black text-lg">Transaction Settled</h4>
              <p className="text-slate-500 text-[10px] font-semibold">Payment settled successfully.</p>
            </div>

            {/* Thermal Print paper layout */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl text-slate-850 font-mono text-[11px] leading-relaxed relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-[radial-gradient(circle_at_5px_0,_transparent_4px,_#e2e8f0_4px)] bg-[length:10px_4px]" />
              
              <div className="text-center border-b border-dashed border-slate-200 pb-3 mb-3.5 mt-1.5">
                <p className="font-bold text-sm tracking-wide text-slate-950">RESTUVEXO CAFE & DINER</p>
                <p className="text-[9px] text-slate-400">cPanel Live operating terminal</p>
              </div>

              <div className="space-y-1 border-b border-dashed border-slate-200 pb-3 mb-3.5 text-slate-500 text-[9px] font-bold">
                <p>Invoice No: {printedOrder.receiptNo || "INV-PENDING"}</p>
                <p>Order No: #ORD-{printedOrder.id}</p>
                <p>Reprint Count: {printedOrder.printCount || 0}</p>
                <p>Date: {new Date(printedOrder.createdAt).toLocaleString()}</p>
                <p>Type: {printedOrder.orderType.toUpperCase()}</p>
              </div>

              {/* Items */}
              <div className="space-y-2 border-b border-dashed border-slate-200 pb-3.5 mb-3.5">
                <div className="flex justify-between font-bold text-slate-950 text-[10px] pb-1.5 border-b border-slate-100">
                  <span>Item Description</span>
                  <span className="w-12 text-center">Qty</span>
                  <span className="w-16 text-right">Price</span>
                </div>
                
                {(printedOrder.orderItems || []).map((item: any, idx: number) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-slate-700">
                      <span className="truncate max-w-[120px] font-bold">{item.menuItem?.name || item.name}</span>
                      <span className="w-12 text-center font-bold">x{item.qty}</span>
                      <span className="w-16 text-right">₹{(parseFloat(item.price) * item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="space-y-1.5 text-right font-bold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-normal">Subtotal</span>
                  <span>₹{parseFloat(printedOrder.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(printedOrder.discountApplied) > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span className="font-normal">Override Discount</span>
                    <span>-₹{parseFloat(printedOrder.discountApplied).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-950 text-xs border-t border-slate-150 pt-1.5 font-black">
                  <span>Grand Total</span>
                  <span>₹{parseFloat(printedOrder.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center border-t border-dashed border-slate-200 pt-3 mt-3 text-slate-400 text-[9px] font-bold">
                <p className="font-bold uppercase tracking-wider text-slate-900">Thank you for dining!</p>
              </div>

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
                onClick={handleReprintReceipt}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs transition shadow-md active:scale-95"
              >
                Print Invoice
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
