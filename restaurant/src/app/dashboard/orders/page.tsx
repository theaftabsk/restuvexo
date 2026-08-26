import { getBackendUrl } from "@/config/api";
"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";

export default function OrdersManager() {
  const [orders, setOrders] = useState([]);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, totalPages: 1 });
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unpaid' | 'paid'
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("search") || "";
    }
    return "";
  });
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [settlingOrderId, setSettlingOrderId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "Yes",
    cancelText: "Cancel",
    onConfirm: null
  });

  const [user, setUser] = useState(null);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, dateFilter, customDate]);

  const BACKEND_URL = getBackendUrl();

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  // ─── Build server-side API URL with all active filters ───────────────────
  const buildOrdersUrl = (page = currentPage) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(itemsPerPage));
    params.set('dateFilter', dateFilter);
    if (dateFilter === 'custom' && customDate) params.set('customDate', customDate);
    if (activeTab !== 'all') params.set('paymentStatus', activeTab);
    return `${BACKEND_URL}/api/orders?${params.toString()}`;
  };

  // Re-fetch from server when any filter or page changes
  useEffect(() => {
    fetchOrders();
  }, [activeTab, dateFilter, customDate, currentPage]);

  // Boot: also load active sessions & set up polling
  useEffect(() => {
    fetchActiveSessions();

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    
    //  SOCKET.IO REAL-TIME CONNECTION
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("Orders Socket Connected:", socket.id);
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

    // Listen for instant order updates pushed by backend
    socket.on("new_order_placed", (order) => {
      fetchOrdersSilently();
      fetchActiveSessions();
    });

    socket.on("order_updated", (order) => {
      fetchOrdersSilently();
      fetchActiveSessions();
    });

    // Backup silent sync every 60s
    const interval = setInterval(() => {
      fetchOrdersSilently();
      fetchActiveSessions();
    }, 60000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleDeleteOrder = (orderId) => {
    // Audit protection: find order paymentStatus
    const orderToDel = orders.find(o => o.id === orderId);
    if (orderToDel && orderToDel.paymentStatus === "paid") {
      triggerToast("Audit Protection: Settled / Paid orders cannot be deleted.", "error");
      return;
    }

    setConfirmModal({
      show: true,
      title: "Delete Order Record",
      message: `WARNING: Are you sure you want to PERMANENTLY DELETE Order #${orderId} from the database? This action is irreversible and will erase all transaction history for this ticket.`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        const token = localStorage.getItem("authToken");
        try {
          const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Deletion failed.");
          
          triggerToast(`Order #${orderId} permanently deleted.`, "success");
          fetchOrders();
        } catch (e) {
          triggerToast(`Error: ${e.message}`, "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      window.location.href = "/auth/login";
      return;
    }
    try {
      const res = await fetch(buildOrdersUrl(), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to sync orders queue.");
      const json = await res.json();
      const fetchedOrders = json.data || [];
      setOrders(fetchedOrders);
      setPaginationMeta(json.pagination || { total: 0, totalPages: 1 });

      // Auto-trigger print modal if print=orderId is set in url query params
      if (typeof window !== "undefined" && fetchedOrders.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const printId = params.get("print");
        if (printId) {
          const orderToPrint = fetchedOrders.find(o => o.id.toString() === printId);
          if (orderToPrint) {
            // Trigger printer modal after a slight delay for page rendering stability
            setTimeout(() => {
              printReceipt(orderToPrint);
            }, 100);
            // Remove print param from URL safely without page reload
            const cleanUrl = window.location.pathname + window.location.search.replace(/[\?&]print=[^&]+/, '').replace(/^&/, '?');
            window.history.replaceState({}, '', cleanUrl);
          }
        }
      }
    } catch (e) {
      triggerToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const playVoiceAlert = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const fetchOrdersSilently = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(buildOrdersUrl(), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        
        setOrders(prev => {
          if (prev.length > 0) {
            const newOrders = data.filter(d => !prev.some(p => p.id === d.id));
            if (newOrders.length > 0) {
              const table = newOrders[0].table?.tableNo || "";
              playVoiceAlert(`New order received ${table ? 'from ' + table : ''}.`);
            } else {
              const updatedToReady = data.filter(d =>
                (d.status === 'ready' || d.status === 'completed') &&
                prev.some(p => p.id === d.id && p.status !== 'ready' && p.status !== 'completed')
              );
              if (updatedToReady.length > 0) {
                const table = updatedToReady[0].table?.tableNo || "";
                playVoiceAlert(`Order is ready for ${table}. Please serve.`);
              }
            }
          }
          return data;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveSessions = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/active-sessions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSessions(data);
      }
    } catch (e) {
      console.error("Failed to sync active visitor sessions:", e);
    }
  };

  const handleClearSession = (sessionId, tableNo) => {
    setConfirmModal({
      show: true,
      title: "Clear Table Session",
      message: `Are you sure you want to clear ${tableNo} active session and mark table as Free?`,
      confirmText: "Yes, Clear",
      cancelText: "Cancel",
      onConfirm: async () => {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        try {
          const res = await fetch(`${BACKEND_URL}/api/tables/active-sessions/${sessionId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to clear session.");
          
          const label = tableNo.toLowerCase().startsWith('table') ? tableNo : `Table ${tableNo}`;
          triggerToast(`${label} cleared & freed successfully!`, "success");
          setActiveSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        } catch (e) {
          triggerToast(`Error: ${e.message}`, "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  const handleBlockDevice = (deviceId, deviceInfo, customerName) => {
    setConfirmModal({
      show: true,
      title: "Block Visitor Device",
      message: `Are you sure you want to PERMANENTLY BLOCK this device? They will never be able to place QR orders again.`,
      confirmText: "Yes, Block Device",
      cancelText: "Cancel",
      onConfirm: async () => {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        try {
          const res = await fetch(`${BACKEND_URL}/api/tables/block-device`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ deviceId, deviceInfo, customerName })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to block device.");
          triggerToast("Device has been permanently blocked.", "success");
          fetchActiveSessions();
        } catch (e) {
          triggerToast(`Error: ${e.message}`, "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  // Cashier One-Click Payment Settlement
  const handleSettlePayment = async (orderId, method) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/settle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod: method })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle payment.");

      triggerToast(` Order #${orderId} paid successfully using ${method.toUpperCase()}!`, "success");
      setSettlingOrderId(null);
      fetchOrders();
    } catch (e) {
      triggerToast(` Settlement failed: ${e.message}`, "error");
    }
  };

  // Cashier approves QR Customer order
  const handleApproveQrOrder = async (orderId) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/approve`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Approval failed.");
      triggerToast(` QR Order #${orderId} approved and sent to Kitchen!`, "success");
      fetchOrders();
    } catch (e) {
      triggerToast(` Error: ${e.message}`, "error");
    }
  };



  // Redirect to POS with loaded order data to edit items/add dishes
  const handleEditInPos = (order) => {
    localStorage.setItem("editOrderId", order.id.toString());
    localStorage.setItem("editOrderTable", order.tableId ? order.tableId.toString() : "");
    localStorage.setItem("editOrderItems", JSON.stringify(order.orderItems));
    localStorage.setItem("editOrderType", order.orderType || "dine_in");
    localStorage.setItem("editOrderDiscount", order.discountApplied ? order.discountApplied.toString() : "0");
    
    // Redirect securely to high-speed billing terminal
    window.location.href = "/dashboard/orders/create";
  };

  // Print thermal 80mm receipt driver
  const printReceipt = (order) => {
    const printWindow = window.open("", "_blank");
    
    const itemsHtml = order.orderItems.map(item => `
      <tr class="item-row">
        <td class="desc">${item.menuItem?.name}</td>
        <td class="qty">${item.qty}</td>
        <td class="amt">₹${(item.qty * parseFloat(item.price)).toFixed(2)}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - #${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            body {
              font-family: 'Courier Prime', monospace;
              width: 280px; /* Standard 80mm thermal receipt width */
              margin: 0 auto;
              padding: 10px;
              font-size: 12px;
              color: #000000;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .header-title { font-size: 16px; font-weight: bold; margin: 5px 0; }
            .divider { border-top: 1px dashed #000000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { border-bottom: 1px dashed #000000; font-weight: bold; text-align: left; }
            td { padding: 4px 0; }
            .qty { text-align: center; }
            .amt { text-align: right; }
            .total-section { font-weight: bold; }
            .footer-msg { font-size: 10px; margin-top: 15px; }
            @media print {
              body { width: 100%; padding: 0; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="header-title">RESTUVEXO BISTRO</div>
            <div>Indian Fusion Dining &amp; Cafe</div>
            <div>Dhaka, Bangladesh</div>
            <div>Ph: +880-1234-56789</div>
          </div>
          
          <div class="divider"></div>
          
          <div>
            <strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}<br>
            <strong>Order ID:</strong> #${order.id}<br>
            <strong>Type:</strong> ${order.orderType.toUpperCase()}<br>
            <strong>Sitting:</strong> ${order.table?.tableNo || "Takeaway"}<br>
            <strong>Server:</strong> ${order.creator?.name || "Cashier Desk"}
          </div>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr>
                <th>ITEM</th>
                <th class="qty font-bold">QTY</th>
                <th class="amt font-bold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table class="total-section">
            <tr>
              <td>Subtotal:</td>
              <td class="right">₹${parseFloat(order.subtotal || order.totalAmount).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Discount:</td>
              <td class="right">-₹${parseFloat(order.discountApplied || 0).toFixed(2)}</td>
            </tr>
            <tr style="font-size: 14px; border-top: 1px dashed #000000;">
              <td><strong>GRAND TOTAL:</strong></td>
              <td class="right"><strong>₹${parseFloat(order.totalAmount).toFixed(2)}</strong></td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div class="center">
            <strong>Payment Method:</strong> ${order.paymentMethod?.toUpperCase() || "UNPAID"}<br>
            <strong>Status:</strong> ${order.paymentStatus?.toUpperCase() || "PENDING CASHIER"}<br>
          </div>
          
          <div class="divider"></div>
          
          <div class="center footer-msg">
            Thank you for dining with us!<br>
            Powered by RESTUVEXO ROS
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  // ─── Server returns already-filtered page, just use it directly ──────────────
  const qrApprovals = orders.filter(order =>
    order.creator?.name === "QR Customer" &&
    order.status === "pending"
  );

  // Client-side search filter only (on the already-paginated page from server)
  const paginatedOrders = orders.filter(o => {
    if (!searchQuery) return true;
    return o.id.toString().includes(searchQuery) ||
      (o.table?.tableNo || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalPages = paginationMeta.totalPages || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  // Stats computed from current server-filtered page results
  const totalRevenueToday = orders
    .filter(o => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
  const unpaidBillsCount = orders.filter(o => o.paymentStatus === "unpaid").length;
  const totalKotCount = paginationMeta.total || orders.length;


  if (loading) {
    return (
      <LoadingScreen message="Syncing order records..." minHeight="50vh" />
    );
  }

  return (
    <div className="space-y-6 text-slate-800 pb-12">

      {/* ========================================================
          GLOBAL GLASSMORPHIC TOAST NOTIFICATION
          ======================================================== */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className={`backdrop-blur-xl border px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[270px] max-w-sm ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600" 
              : "bg-slate-900/95 border-slate-800 text-slate-100"
          }`}>
            <span className="text-base">
              {toast.type === "success" ? "" : ""}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black tracking-wide leading-relaxed truncate">{toast.message}</p>
            </div>
          </div>
        </div>
      )}



      {/* STATS ZONE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Rev */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-[2rem] shadow-xl shadow-slate-100/25">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Settled Gross Revenue</p>
          <h4 className="text-2xl font-black text-slate-900 mt-2">₹{totalRevenueToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
          <span className="inline-block px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase tracking-wider mt-2.5"> Verified Cashier Total</span>
        </div>

        {/* Unpaid */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-[2rem] shadow-xl shadow-slate-100/25">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Pending Payments</p>
          <h4 className="text-2xl font-black text-[#ff5722] mt-2">{unpaidBillsCount} Unsettled Bills</h4>
          <span className="inline-block px-2 py-0.5 bg-orange-500/10 text-[#ff5722] rounded text-[9px] font-black uppercase tracking-wider mt-2.5"> Awaiting Cash/UPI</span>
        </div>

        {/* Total Orders */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-5 rounded-[2rem] shadow-xl shadow-slate-100/25">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total KOTs Today</p>
          <h4 className="text-2xl font-black text-slate-900 mt-2">{totalKotCount} Dispatched</h4>
          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-wider mt-2.5"> Live ROS Ticket Stream</span>
        </div>
      </div>

      {/* FILTER & TABLE BLOCK */}
      <div className="bg-white border-2 border-slate-200/80 rounded-[2.5rem] p-6 shadow-xl space-y-6">
        
        {/* Filters, Date and search */}
        <div className="space-y-4">
          
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center border-b border-slate-100 pb-5">
            {/* Payment Status Tabs */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Payment:</span>
              <div className="flex gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-150">
                {["all", "unpaid", "paid"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${activeTab === tab ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Filters Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Date Period:</span>
              <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-150">
                {[
                  { value: "today", label: "Today" },
                  { value: "yesterday", label: "Yesterday" },
                  { value: "last7days", label: "Last 7 Days" },
                  { value: "all", label: "All Time" },
                  { value: "custom", label: "Custom Date" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDateFilter(opt.value)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${dateFilter === opt.value ? 'bg-[#ff5722] text-white shadow-md' : 'text-slate-500 hover:text-slate-950'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Input (Shown when 'custom' is active) */}
              {dateFilter === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-[10px] font-black focus:border-[#ff5722] focus:outline-none transition shadow-sm"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="text-slate-400 text-[10px] font-semibold">
              Showing <span className="text-slate-900 font-black">{paginationMeta.total > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, paginationMeta.total)}</span> of <span className="text-slate-900 font-black">{paginationMeta.total}</span> matching records
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Search table, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition shadow-sm"
              />
            </div>
          </div>

        </div>

        {/* Table representation */}
        <div className="overflow-x-auto rounded-3xl border border-slate-150">
          <table className="min-w-full divide-y divide-slate-150 text-left text-xs font-bold text-slate-700 bg-white">
            <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-450 tracking-widest border-b border-slate-150">
              <tr>
                <th className="px-6 py-4">KOT ID</th>
                <th className="px-6 py-4">Table / Type</th>
                <th className="px-6 py-4">Order Items</th>
                <th className="px-6 py-4">Subtotal</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-black">
                     No billing tickets matching the search.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 text-slate-950 font-black">#{order.id}</td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-150 rounded-lg text-slate-850 text-[10px] font-black uppercase tracking-wide">
                           {order.table?.tableNo || "Takeaway"}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold pl-0.5 flex items-center gap-1 flex-wrap">
                        <span className="text-slate-400"> Source:</span>
                        {order.approvedBy ? (
                          <span className="text-indigo-600 font-extrabold uppercase tracking-wide">
                             {order.approvedBy}
                          </span>
                        ) : order.creator?.name === "QR Customer" || order.creator?.phone?.startsWith("QR-") ? (
                          <span className="text-amber-500 font-black uppercase tracking-wide animate-pulse">
                             QR (Pending Approve)
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-black uppercase tracking-wide">
                             {order.creator?.name || "Staff"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[220px] truncate" title={order.orderItems.map(i => `${i.menuItem?.name} x${i.qty}`).join(", ")}>
                      {order.orderItems.map(i => `${i.menuItem?.name} x${i.qty}`).join(", ")}
                    </td>
                    <td className="px-6 py-4 text-slate-950 font-black">₹{parseFloat(order.totalAmount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {order.status === "cancelled" ? (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-rose-50 border-rose-100 text-rose-600">
                           REJECTED
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          order.paymentStatus === 'paid' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 animate-pulse'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2 flex-wrap">
                      {order.status === "cancelled" ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-block py-1.5 px-3 bg-rose-50/60 border border-rose-100/80 text-rose-500 text-[9px] font-black uppercase tracking-widest rounded-xl">
                             Cancelled
                          </span>
                          {user?.role === "owner" && (
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition shadow-sm"
                              title="Permanently Delete Order"
                            >
                               Delete
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => printReceipt(order)}
                            className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-widest rounded-xl transition"
                            title="Print Thermal Receipt"
                          >
                             Receipt
                          </button>



                          {order.paymentStatus === "unpaid" && (
                            <button
                              onClick={() => handleEditInPos(order)}
                              className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200/60 text-[9px] font-black uppercase tracking-widest rounded-xl transition"
                              title="Edit items / add dishes to this order"
                            >
                               Edit
                            </button>
                          )}

                          {order.paymentStatus === "unpaid" && (
                            <button
                              onClick={() => window.location.href = `/dashboard/pos?orderId=${order.id}`}
                              className="py-1.5 px-3 bg-[#ff5722] hover:bg-[#e04c1c] text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm transition"
                              title="Settle payment for this order on POS Billing"
                            >
                               Settle
                            </button>
                          )}

                          {user?.role === "owner" && order.paymentStatus !== "paid" && (
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition shadow-sm"
                              title="Permanently Delete Order"
                            >
                               Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MAGNIFICENT PREMIUM PAGINATION CONTROLLER */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-1 active:scale-95 disabled:pointer-events-none"
            >
              ← Previous Page
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNo = idx + 1;
                // Sliding window: only show current, current-1, current+1, 1, and totalPages
                if (
                  pageNo === 1 ||
                  pageNo === totalPages ||
                  Math.abs(pageNo - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNo}
                      onClick={() => setCurrentPage(pageNo)}
                      className={`w-9.5 h-9.5 rounded-xl font-black text-[10px] transition ${
                        currentPage === pageNo
                          ? 'bg-slate-950 text-white shadow-md'
                          : 'bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {pageNo}
                    </button>
                  );
                } else if (
                  (pageNo === 2 && currentPage > 3) ||
                  (pageNo === totalPages - 1 && currentPage < totalPages - 2)
                ) {
                  return <span key={pageNo} className="text-slate-400 text-xs px-1">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-1 active:scale-95 disabled:pointer-events-none"
            >
              Next Page →
            </button>
          </div>
        )}

      </div>



      {/* --- PREMIUM CUSTOM CONFIRMATION MODAL --- */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative border border-slate-150 text-slate-800 animate-scale-up">
            
            {/* Destructive Warning Icon */}
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 animate-pulse">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="text-center space-y-2 mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {confirmModal.title}
              </h3>
              <p className="text-xs font-bold text-slate-500 leading-relaxed px-2">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition active:scale-95 border border-slate-200"
              >
                {confirmModal.cancelText}
              </button>
              
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-500/10 transition active:scale-95"
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
