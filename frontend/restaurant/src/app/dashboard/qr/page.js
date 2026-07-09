"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";

export default function QrLiveDashboard() {
  const [orders, setOrders] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  //  Premium Toast, Telemetry Modal, and Custom Confirmation Modal States
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    type: "clear", // "clear" or "block"
    sessionId: null,
    tableNo: "",
    deviceId: null,
    deviceInfo: "",
    customerName: ""
  });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  useEffect(() => {
    fetchData();
    
    // SOCKET.IO REAL-TIME CONNECTION
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("Live Socket Connected:", socket.id);
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

    // Listen for instant order alerts pushed by backend
    socket.on("new_order_placed", (order) => {
      if (order?.creator?.name === "QR Customer" || order?.creator?.role === "customer") {
        playVoiceAlert(`New pending order submitted from ${order.table?.tableNo || "table"}. Please review.`);
      }
      fetchDataSilently();
    });

    socket.on("new_qr_order_placed", (order) => {
      playVoiceAlert(`New pending order submitted from ${order.table?.tableNo || "table"}. Please review.`);
      fetchDataSilently();
    });

    socket.on("order_status_updated", () => {
      fetchDataSilently();
    });

    socket.on("order_deleted", () => {
      fetchDataSilently();
    });

    socket.on("table_updated", () => {
      fetchDataSilently();
    });

    // Backup silent sync every 60s
    const interval = setInterval(() => {
      fetchDataSilently();
    }, 60000); 

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      // 1. Fetch pending QR orders only
      const orderRes = await fetch(`${BACKEND_URL}/api/orders?status=pending&dateFilter=all&limit=50&qrApprovalOnly=true&_=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (orderRes.ok) {
        const json = await orderRes.json();
        setOrders(json.data || []);
      }

      // 2. Fetch Floor Telemetry
      const sessionsRes = await fetch(`${BACKEND_URL}/api/tables/active-sessions?_=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setActiveSessions(sessionsData);
      }
    } catch (e) {
      triggerToast("Failed to synchronize live QR telemetry.", "error");
    } finally {
      setLoading(false);
    }
  };

  const playVoiceAlert = (text) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const fetchDataSilently = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const orderRes = await fetch(`${BACKEND_URL}/api/orders?status=pending&dateFilter=all&limit=50&qrApprovalOnly=true&_=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (orderRes.ok) {
        const json = await orderRes.json();
        const orderData = json.data || [];

        setOrders(prev => {
          if (prev.length > 0) {
            const prevPendingQr = prev.filter(o => o.creator?.name === "QR Customer" && o.status === "pending");
            const nextPendingQr = orderData.filter(o => o.creator?.name === "QR Customer" && o.status === "pending");
            const newQrOrders = nextPendingQr.filter(d => !prevPendingQr.some(p => p.id === d.id));
            if (newQrOrders.length > 0) {
              const tbl = newQrOrders[0].table?.tableNo || "a table";
              playVoiceAlert(`New pending order submitted from ${tbl}. Please review.`);
            }
          }
          return orderData;
        });
      }

      const sessionsRes = await fetch(`${BACKEND_URL}/api/tables/active-sessions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setActiveSessions(sessionsData);
      }
    } catch (e) {
      console.error(e);
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
      triggerToast(`Order #${orderId} approved and dispatched to Kitchen!`, "success");
      fetchDataSilently();
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    }
  };



  // Trigger Clear Table Session Confirm Modal
  const triggerClearSessionConfirm = (sessionId, tableNo) => {
    setConfirmModal({
      show: true,
      type: "clear",
      sessionId,
      tableNo,
      deviceId: null,
      deviceInfo: "",
      customerName: ""
    });
  };

  // Execute Table Session Clear
  const executeClearSession = async () => {
    const token = localStorage.getItem("authToken");
    const { sessionId, tableNo } = confirmModal;
    setConfirmModal(prev => ({ ...prev, show: false }));
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/active-sessions/${sessionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear session.");
      
      const tableSession = activeSessions.find(s => s.sessionId === sessionId);
      if (tableSession && tableSession.tableId) {
        await fetch(`${BACKEND_URL}/api/tables/${tableSession.tableId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ status: "free" })
        });
      }

      const label = tableNo.toLowerCase().startsWith('table') ? tableNo : `Table ${tableNo}`;
      triggerToast(`${label} session cleared and marked as Free.`, "success");
      fetchDataSilently();
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    }
  };

  // Trigger Block Spam Device Confirm Modal
  const triggerBlockDeviceConfirm = (deviceId, deviceInfo, customerName) => {
    setConfirmModal({
      show: true,
      type: "block",
      sessionId: null,
      tableNo: "",
      deviceId,
      deviceInfo,
      customerName
    });
  };

  // Execute Spam Device Block
  const executeBlockDevice = async () => {
    const token = localStorage.getItem("authToken");
    const { deviceId, deviceInfo, customerName } = confirmModal;
    setConfirmModal(prev => ({ ...prev, show: false }));
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/block-device`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ deviceId, deviceInfo, customerName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to block device.");
      triggerToast("Device has been permanently firewalled from network.", "success");
      fetchDataSilently();
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    }
  };

  // Filter unapproved QR orders for the approvals queue
  const qrApprovals = orders.filter(order => 
    order.creator?.name === "QR Customer" && 
    order.status === "pending"
  );

  if (loading) {
    return <LoadingScreen message="Connecting to floor telemetry..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 text-slate-800 pb-12 font-sans">
      
      {/* GLOBAL GLASSMORPHIC TOAST NOTIFICATION */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[130] animate-slide-up">
          <div className={`backdrop-blur-xl border px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-sm transition duration-300 ${
            toast.type === "success" 
              ? "bg-emerald-950/90 border-emerald-500/30 text-white" 
              : toast.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-750"
                : "bg-slate-900 border-slate-700 text-white"
          }`}>
            <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-current animate-pulse" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] font-black uppercase tracking-wider leading-relaxed truncate">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-100 pb-6 text-left">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">QR Self-Order Hub</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            Audit customer live self-orders, monitor table browser telemetry, and regulate spam firewalls
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Floor Telemetry Trigger Button */}
          <button
            onClick={() => setShowTelemetryModal(true)}
            className="px-5 py-3 font-extrabold rounded-2xl text-[10px] uppercase tracking-wider bg-slate-900 hover:bg-slate-850 text-white shadow-md transition whitespace-nowrap active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Floor Telemetry &amp; Anti-Spam
            {activeSessions.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-450 animate-ping inline-block shrink-0" />
            )}
          </button>

          <span className="hidden md:flex px-3 py-2.5 bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600 rounded-xl items-center gap-2 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block animate-pulse" />
            Telemetry Link Active
          </span>
        </div>
      </div>

      {/* ========================================================
           QR CUSTOMER SELF-ORDER APPROVALS QUEUE
          ======================================================== */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-100/40 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-650 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">Incoming QR Self-Orders</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                Confirm incoming table orders to immediately dispatch them to the kitchen display board
              </p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
            qrApprovals.length > 0 ? "bg-[#ff5722] text-white animate-pulse" : "bg-slate-50 border border-slate-150 text-slate-500"
          }`}>
            {qrApprovals.length} Pending
          </span>
        </div>

        {qrApprovals.length === 0 ? (
          <div className="py-16 text-center space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center mx-auto text-slate-550">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-sm leading-none">Approvals Queue is Empty</h4>
              <p className="text-slate-450 text-[10px] font-semibold leading-relaxed pt-1.5">
                When customer self-orders arrive from dining tables, they will instantly pop up here with voice notifications.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
            {qrApprovals.map(order => (
              <div 
                key={order.id} 
                className="bg-white border border-slate-200 p-6 rounded-[2.2rem] flex flex-col justify-between gap-5 shadow-xl hover:shadow-2xl transition duration-300 relative"
              >
                {/* Top Info */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 tracking-wider">#QR-{order.id}</span>
                      <h4 className="font-black text-slate-900 text-sm leading-none pt-0.5">Table {order.table?.tableNo || "N/A"}</h4>
                    </div>
                    <span className="px-2.5 py-1 bg-orange-50 border border-orange-100 text-orange-600 rounded-lg text-[8px] font-black uppercase tracking-wider animate-pulse">
                      Reviewing
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Time: {new Date(order.createdAt).toLocaleTimeString()}
                  </div>

                  {/* Order Items list */}
                  <ul className="space-y-2 pt-1 text-slate-700 font-bold text-xs">
                    {order.orderItems.map((item, idx) => (
                      <li key={idx} className="flex flex-col gap-1 bg-slate-50/50 p-3 border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-800 font-extrabold">• {item.menuItem?.name}</span>
                          <span className="font-black text-rose-600 text-sm shrink-0">x{item.qty}</span>
                        </div>
                        {item.note && (
                          <div className="text-[9px] text-[#ff5722] font-black uppercase tracking-wide bg-orange-50/50 border border-orange-100 rounded-lg px-2 py-1 ml-2 mt-1 flex items-start gap-1">
                            Note: {item.note}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Approve Button */}
                <div className="pt-3.5 border-t border-slate-100">
                  <button
                    onClick={() => handleApproveQrOrder(order.id)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-xl text-[9px] uppercase tracking-widest transition active:scale-95 shadow-md text-center"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
           FULL-IMMERSIVE FLOOR TELEMETRY & ANTI-SPAM MODAL
          ======================================================== */}
      {showTelemetryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl relative border border-slate-100 text-slate-800 animate-slide-up text-left">
            
            {/* Elegant Floating Close Button */}
            <button 
              onClick={() => setShowTelemetryModal(false)}
              className="absolute top-6 right-6 w-9 h-9 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition duration-300"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <div className="mb-6 border-b border-slate-50 pb-5 pr-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-650 shrink-0">
                  <svg className="w-5 h-5 animate-pulse text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Live Table Telemetry &amp; Anti-Spam Control</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">
                    Audit active visitor device sessions in the dining room. Clear idle table tabs or blacklist spammers
                  </p>
                </div>
              </div>
            </div>

            {/* Table Content */}
            {activeSessions.length === 0 ? (
              <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
                <div className="w-16 h-16 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center mx-auto text-slate-550">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-slate-900 text-sm leading-none">No active table sessions</h4>
                  <p className="text-slate-450 text-[10px] font-semibold leading-relaxed pt-1.5">
                    Dynamic QR scanner sessions will reflect live as soon as a visitor scans a table QR code and opens the portal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm">
                <table className="w-full text-left border-collapse text-xs font-bold text-slate-650 bg-white">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-150 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                      <th className="p-5 pl-8">Active Table</th>
                      <th className="p-5">Diner Details</th>
                      <th className="p-5">Device Parameters</th>
                      <th className="p-5 text-right pr-8">Auditing Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                    {activeSessions.map((session) => (
                      <tr key={session.sessionId} className="hover:bg-slate-50/30 transition">
                        
                        {/* Active Table */}
                        <td className="p-5 pl-8">
                          <span className="font-black text-slate-900 text-sm">Table {session.tableNo || "N/A"}</span>
                          <p className="text-[9px] text-slate-450 font-black uppercase tracking-widest mt-1">Telemetry Active</p>
                        </td>

                        {/* Diner Details */}
                        <td className="p-5 font-bold">
                          <p className="font-black text-slate-900 text-sm leading-tight">{session.customerName || "Walk-in Guest"}</p>
                          <p className="text-[9px] text-slate-400 font-mono tracking-wide mt-1">ID: {session.sessionId.substring(0, 10)}...</p>
                        </td>

                        {/* Device Parameters */}
                        <td className="p-5">
                          <p className="text-slate-900 font-black text-xs flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            {session.deviceInfo || "Unknown Device"}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="p-5 text-right pr-8 space-x-2">
                          <button
                            onClick={() => triggerClearSessionConfirm(session.sessionId, session.tableNo)}
                            className="py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 text-[9px] font-black uppercase tracking-widest rounded-xl transition"
                            title="Free Table & Clear active session"
                          >
                            Free Table
                          </button>
                          <button
                            onClick={() => triggerBlockDeviceConfirm(session.deviceId, session.deviceInfo, session.customerName || "Anonymous")}
                            className="py-2 px-4 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-100/50 text-[9px] font-black uppercase tracking-widest rounded-xl transition duration-300"
                            title="Firewall spammer device permanently"
                          >
                            Block Device
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowTelemetryModal(false)}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-2xl text-[10px] uppercase tracking-wider transition active:scale-95 shadow-md"
              >
                Close Telemetry Panel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
           PREMIUM CUSTOM CONFIRMATION OVERLAY MODALS
          ======================================================== */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in text-center">
          <div className="bg-white rounded-[2.2rem] p-8 w-full max-w-sm shadow-2xl relative border border-slate-100 text-slate-800 animate-slide-up">
            
            {confirmModal.type === "clear" ? (
              <>
                {/* Clear Table Icon */}
                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Free Dining Table</h3>
                <p className="text-slate-550 text-xs font-semibold leading-relaxed mt-3.5 mb-6.5">
                  Are you sure you want to clear Table {confirmModal.tableNo}&apos;s session? This will force-close their browser portal and release the table.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeClearSession}
                    className="py-3.5 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95 shadow-md"
                  >
                    Release Table
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Block Device Shield Icon */}
                <div className="w-14 h-14 bg-rose-50 text-rose-550 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Block Spammer</h3>
                <p className="text-slate-550 text-xs font-semibold leading-relaxed mt-3.5 mb-6.5">
                  Are you sure you want to PERMANENTLY BLOCK {confirmModal.customerName}&apos;s device? They will be blacklisted from placing orders.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeBlockDevice}
                    className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95 shadow-md"
                  >
                    Block Device
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
