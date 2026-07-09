"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import LoadingScreen from "@/components/LoadingScreen";

export default function TableManagerDashboard() {
  const [tables, setTables] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [qrOrderingEnabled, setQrOrderingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const [restaurant, setRestaurant] = useState(null);
  const [printThemeModal, setPrintThemeModal] = useState({ show: false, table: null });
  
  // Table Add/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add"); // 'add' | 'edit'
  const [activeTableId, setActiveTableId] = useState(null);
  const [tableNameInput, setTableNameInput] = useState("");
  const [qrUrls, setQrUrls] = useState({}); // Local 100% offline generated QR URLs

  //  Premium Custom Confirmation Modal State (To eliminate ugly browser popups!)
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    confirmColor: "bg-slate-900 hover:bg-slate-800",
    onConfirm: () => {}
  });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  useEffect(() => {
    const storedRestaurant = localStorage.getItem("restaurant");
    if (storedRestaurant) setRestaurant(JSON.parse(storedRestaurant));
    fetchTablesAndSettings();

    // SOCKET.IO REAL-TIME CONNECTION
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("Tables Socket Connected:", socket.id);
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

    // Listen for instant updates
    socket.on("table_updated", () => {
      fetchTablesAndSettings(true);
    });
    
    socket.on("new_order_placed", () => {
      fetchTablesAndSettings(true); 
    });

    socket.on("order_status_updated", () => {
      fetchTablesAndSettings(true);
    });

    socket.on("order_updated", () => {
      fetchTablesAndSettings(true);
    });

    socket.on("order_deleted", () => {
      fetchTablesAndSettings(true);
    });

    socket.on("sidebar_telemetry_updated", (data) => {
      if (data && data.qrOrderingEnabled !== undefined) {
        setQrOrderingEnabled(data.qrOrderingEnabled);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 100% Offline client-side QR generation hook
  useEffect(() => {
    const generateQrs = async () => {
      const urls = {};
      for (const table of tables) {
        const link = `${window.location.origin}/scan/${table.qrCode || table.id}`;
        try {
          const url = await QRCode.toDataURL(link, {
            margin: 2,
            width: 250,
            color: {
              dark: "#0f172a", // sleek dark slate
              light: "#ffffff"
            }
          });
          urls[table.id] = url;
        } catch (err) {
          console.error("Offline QR generation failed:", err);
        }
      }
      setQrUrls(urls);
    };
    if (tables.length > 0) {
      generateQrs();
    }
  }, [tables]);

  const fetchTablesAndSettings = async (isSilent = false) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      if (!isSilent) setLoading(false);
      window.location.href = "/auth/login";
      return;
    }

    try {
      const tableRes = await fetch(`${BACKEND_URL}/api/tables?_=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (tableRes.ok) {
        const tableData = await tableRes.json();
        setTables(tableData);
      }

      const sessionsRes = await fetch(`${BACKEND_URL}/api/tables/active-sessions?_=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setActiveSessions(sessionsData);
      }

      if (!isSilent) {
        const settingRes = await fetch(`${BACKEND_URL}/api/tables/settings?_=${Date.now()}`, {
          headers: { "Authorization": `Bearer ${token}` },
          cache: 'no-store'
        });
        if (settingRes.ok) {
          const settingData = await settingRes.json();
          setQrOrderingEnabled(settingData.qrOrderingEnabled);
        }
      }
    } catch (e) {
      console.error(e);
      if (!isSilent) triggerToast("Failed to synchronize floor parameters.", "error");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleToggleQrOrdering = async () => {
    const token = localStorage.getItem("authToken");
    setActionLoading(true);
    const targetState = !qrOrderingEnabled;

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ qrOrderingEnabled: targetState })
      });

      if (!res.ok) throw new Error("Settings update failed.");
      
      setQrOrderingEnabled(targetState);
      triggerToast(
        targetState 
          ? "QR Customer Self-Ordering is now ENABLED!"
          : "QR Customer Self-Ordering is now DISABLED!",
        "success"
      );
    } catch (e) {
      triggerToast(`Failed: ${e.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (tableId, newStatus) => {
    const token = localStorage.getItem("authToken");
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/${tableId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status.");
      
      triggerToast(`Table status updated to ${newStatus.toUpperCase()}`, "success");
      fetchTablesAndSettings(true);
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Trigger Custom Session Clear Confirmation ---
  const triggerClearSessionConfirm = (sessionId, tableId, tableNo) => {
    setConfirmModal({
      show: true,
      title: "Force-Free Table Session",
      message: `Are you sure you want to FORCE-FREE ${tableNo}? This will expire their guest checkout session immediately.`,
      confirmText: "Force Free",
      confirmColor: "bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/20",
      onConfirm: () => executeClearTableSession(sessionId, tableId, tableNo)
    });
  };

  const executeClearTableSession = async (sessionId, tableId, tableNo) => {
    const token = localStorage.getItem("authToken");
    setActionLoading(true);
    setConfirmModal(prev => ({ ...prev, show: false }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/active-sessions/${sessionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to clear session.");

      await fetch(`${BACKEND_URL}/api/tables/${tableId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "free" })
      });

      const label = tableNo.toLowerCase().startsWith('table') ? tableNo : `Table ${tableNo}`;
      triggerToast(`${label} cleared and freed successfully!`, "success");
      fetchTablesAndSettings(true);
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const openAddModal = () => {
    setModalType("add");
    setTableNameInput("");
    setShowModal(true);
  };

  const openEditModal = (table) => {
    setModalType("edit");
    setActiveTableId(table.id);
    setTableNameInput(table.tableNo);
    setShowModal(true);
  };

  const handleSaveTable = async () => {
    if (!tableNameInput.trim()) {
      triggerToast("Table name cannot be empty.", "error");
      return;
    }
    const token = localStorage.getItem("authToken");
    setActionLoading(true);

    try {
      if (modalType === "add") {
        const res = await fetch(`${BACKEND_URL}/api/tables`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ tableNo: tableNameInput })
        });
        if (!res.ok) throw new Error("Failed to add table.");
        triggerToast("Table created successfully!", "success");
      } else {
        const res = await fetch(`${BACKEND_URL}/api/tables/${activeTableId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ tableNo: tableNameInput })
        });
        if (!res.ok) throw new Error("Failed to update table.");
        triggerToast("Table updated successfully!", "success");
      }
      setShowModal(false);
      fetchTablesAndSettings();
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Trigger Custom Table Deletion Confirmation ---
  const triggerDeleteTableConfirm = (id, tableNo) => {
    setConfirmModal({
      show: true,
      title: "Remove Dining Table",
      message: `Are you sure you want to remove ${tableNo} from your floor layout? This action cannot be undone.`,
      confirmText: "Delete Table",
      confirmColor: "bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/20",
      onConfirm: () => executeDeleteTable(id)
    });
  };

  const executeDeleteTable = async (id) => {
    const token = localStorage.getItem("authToken");
    setActionLoading(true);
    setConfirmModal(prev => ({ ...prev, show: false }));
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete table. Make sure no active orders exist.");
      triggerToast("Table removed from floor.", "success");
      fetchTablesAndSettings();
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const copyTableLink = (table) => {
    const link = `${window.location.origin}/scan/${table.qrCode || table.id}`;
    navigator.clipboard.writeText(link);
    const label = table.tableNo.toLowerCase().startsWith('table') ? table.tableNo : `Table ${table.tableNo}`;
    triggerToast(`${label} menu link copied!`, "success");
  };

  const printTableCard = async (table, theme = 'classic') => {
    let printQrUrl = "";
    try {
      const link = `${window.location.origin}/scan/${table.qrCode || table.id}`;
      const qrColor = theme === 'dark' ? "#ffffff" : "#0f172a";
      const qrBg = theme === 'dark' ? "#0f172a" : "#ffffff";
      printQrUrl = await QRCode.toDataURL(link, {
        margin: 1,
        width: 500,
        color: { dark: qrColor, light: qrBg }
      });
    } catch (err) {
      printQrUrl = qrUrls[table.id] || "";
    }

    const restaurantName = restaurant?.name || "Our Restaurant";

    const themes = {
      classic: {
        body: `background: #fff;`,
        card: `background: #ffffff; border: 3px solid #0f172a; border-radius: 32px; padding: 40px; width: 320px;`,
        logo: `color: #ff5722; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin: 0 0 4px 0;`,
        poweredBy: `font-size: 8px; font-weight: 700; letter-spacing: 2px; color: #94a3b8; text-transform: uppercase; margin: 0 0 24px 0;`,
        badge: `background: #0f172a; color: #fff; padding: 8px 24px; border-radius: 12px; font-size: 14px; font-weight: 900; display: inline-block; margin-bottom: 24px;`,
        qrWrapper: `background: #fff; border: 2px solid #e2e8f0; border-radius: 20px; padding: 12px; width: 230px; height: 230px; margin: 0 auto 24px;`,
        instr: `font-size: 11px; font-weight: 600; color: #334155; line-height: 1.5;`,
        instrStrong: `color: #ff5722;`,
        footer: `margin-top: 20px; font-size: 8px; color: #cbd5e1; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;`,
      },
      dark: {
        body: `background: #0f172a;`,
        card: `background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid #334155; border-radius: 32px; padding: 40px; width: 320px; box-shadow: 0 25px 60px rgba(0,0,0,0.5);`,
        logo: `color: #ff5722; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin: 0 0 4px 0;`,
        poweredBy: `font-size: 8px; font-weight: 700; letter-spacing: 2px; color: #475569; text-transform: uppercase; margin: 0 0 24px 0;`,
        badge: `background: #ff5722; color: #fff; padding: 8px 24px; border-radius: 12px; font-size: 14px; font-weight: 900; display: inline-block; margin-bottom: 24px;`,
        qrWrapper: `background: #0f172a; border: 2px solid #334155; border-radius: 20px; padding: 12px; width: 230px; height: 230px; margin: 0 auto 24px;`,
        instr: `font-size: 11px; font-weight: 600; color: #94a3b8; line-height: 1.5;`,
        instrStrong: `color: #ff5722;`,
        footer: `margin-top: 20px; font-size: 8px; color: #334155; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;`,
      },
      elegant: {
        body: `background: #faf7f4;`,
        card: `background: linear-gradient(160deg, #fff8f5, #ffffff); border: 2px solid #fcd9c9; border-radius: 32px; padding: 40px; width: 320px; box-shadow: 0 10px 40px rgba(255,87,34,0.08);`,
        logo: `color: #c2410c; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin: 0 0 4px 0;`,
        poweredBy: `font-size: 8px; font-weight: 700; letter-spacing: 2px; color: #d97706; text-transform: uppercase; margin: 0 0 24px 0;`,
        badge: `background: linear-gradient(135deg, #ff5722, #f59e0b); color: #fff; padding: 8px 24px; border-radius: 12px; font-size: 14px; font-weight: 900; display: inline-block; margin-bottom: 24px;`,
        qrWrapper: `background: #fff; border: 2px solid #fcd9c9; border-radius: 20px; padding: 12px; width: 230px; height: 230px; margin: 0 auto 24px;`,
        instr: `font-size: 11px; font-weight: 600; color: #7c2d12; line-height: 1.5;`,
        instrStrong: `color: #c2410c;`,
        footer: `margin-top: 20px; font-size: 8px; color: #fcd9c9; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;`,
      }
    };

    const t = themes[theme];

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Card - ${table.tableNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;900&display=swap');
            * { box-sizing: border-box; }
            body { font-family: 'Outfit', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; ${t.body} }
            .tent-card { ${t.card} text-align: center; }
            .rest-name { ${t.logo} }
            .powered { ${t.poweredBy} }
            .table-badge { ${t.badge} }
            .qr-wrapper { ${t.qrWrapper} }
            .qr-wrapper img { width: 100%; height: 100%; object-fit: contain; }
            .instructions { ${t.instr} }
            .instructions strong { ${t.instrStrong} }
            .footer-brand { ${t.footer} }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="tent-card">
            <div class="rest-name">${restaurantName.toUpperCase()}</div>
            <div class="powered">Powered by RestroServe</div>
            <div class="table-badge">${table.tableNo.toUpperCase()}</div>
            <div class="qr-wrapper"><img src="${printQrUrl}" alt="QR" /></div>
            <div class="instructions"><strong>SCAN QR TO ORDER FOOD</strong><br>Browse digital menu &amp; submit orders!</div>
            <div class="footer-brand">restroserve &bull; smart dining</div>
          </div>
          <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return <LoadingScreen message="Syncing floor plan..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 text-slate-800 pb-16 relative min-h-screen font-sans">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className={`backdrop-blur-xl border px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-sm ${
            toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" : "bg-rose-500/10 border-rose-500/20 text-rose-700"
          }`}>
            <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-current animate-pulse" />
            <p className="text-[11px] font-black tracking-wide leading-relaxed truncate">{toast.message}</p>
          </div>
        </div>
      )}

      {/* SECTION ACTION BAR */}
      <div className="flex justify-between items-center pb-2 text-left">
        <div>
          <h3 className="text-sm font-black text-slate-900 leading-tight">Dine-In Floor Map</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
            Configure dynamic physical seating cards and manage active dining room sessions
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-3 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-md transition active:scale-95 whitespace-nowrap"
        >
          Add New Table
        </button>
      </div>

      {/* GUEST QR ORDERING SETTINGS CARD */}
      <div className="bg-white border border-slate-150 p-6 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl text-left">
          <h3 className="text-slate-900 font-black text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Customer QR Self-Ordering Portal
          </h3>
          <p className="text-slate-500 text-[10px] font-semibold leading-relaxed">
            When ENABLED, visitors scanning their table QR code can place in-store food orders directly from their phones. If DISABLED, it acts as a View-Only digital menu.
          </p>
        </div>
        <button
          onClick={handleToggleQrOrdering}
          disabled={actionLoading}
          className={`relative inline-flex h-9 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-255 focus:outline-none ${qrOrderingEnabled ? "bg-[#ff5722]" : "bg-slate-200"} disabled:opacity-50`}
        >
          <span className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition duration-255 ${qrOrderingEnabled ? "translate-x-11" : "translate-x-0"}`} />
        </button>
      </div>

      {/* TABLE CARDS GRID */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map(table => {
          const activeSession = activeSessions.find(s => s.tableId === table.id);

          return (
            <div key={table.id} className="bg-white border border-slate-200 p-6 rounded-[2.2rem] shadow-xl hover:shadow-2xl hover:border-slate-350 transition duration-300 relative group flex flex-col items-center text-center space-y-4">
              
              {/* Top Controls (Edit/Delete - Outlined and clean) */}
              <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditModal(table)} 
                  className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-105 border border-slate-200 flex items-center justify-center text-slate-500 transition" 
                  title="Edit Table"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={() => triggerDeleteTableConfirm(table.id, table.tableNo)} 
                  className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 flex items-center justify-center text-rose-500 transition" 
                  title="Delete Table"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Branding details */}
              <div className="space-y-1 pt-1">
                <span className="text-[8px] font-black tracking-widest text-[#ff5722] uppercase">{restaurant?.name || "RestroServe"}</span>
                <h4 className="font-black text-slate-900 text-sm leading-none">{table.tableNo}</h4>
              </div>

              {/* QR Image Frame - 100% Offline local render */}
              <div className="w-44 h-44 bg-slate-50 border border-slate-100 rounded-[1.8rem] flex items-center justify-center p-3.5 shadow-inner">
                {qrUrls[table.id] ? (
                  <img src={qrUrls[table.id]} alt="QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
                )}
              </div>

              {/* Live status drop down selector */}
              <div className="w-full">
                <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-black text-slate-600">
                  <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                    table.status === "free" ? "bg-emerald-500 animate-pulse" :
                    table.status === "reserved" ? "bg-amber-500" : "bg-rose-500"
                  }`} />
                  <select
                    value={table.status}
                    onChange={(e) => handleUpdateStatus(table.id, e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer uppercase text-[9px] font-black text-slate-700 w-full"
                  >
                    <option value="free">Free</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>

              {/* Active Session details if Occupied */}
              {activeSession && (
                <div className="w-full bg-rose-50/40 border border-rose-150 p-4 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-[8px] font-black text-rose-500 uppercase tracking-widest">
                    <svg className="w-3 h-3 text-rose-455" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Active Guest Session
                  </div>
                  <p className="text-[10px] font-black text-slate-800 truncate">
                    {activeSession.customerName || "Walk-in Guest"}
                  </p>
                  <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider pt-0.5">
                    <span>{activeSession.deviceInfo || "Device"}</span>
                    <span>{activeSession.customerPhone || "No Phone"}</span>
                  </div>
                  
                  <button
                    onClick={() => triggerClearSessionConfirm(activeSession.sessionId, table.id, table.tableNo)}
                    className="w-full mt-2 py-2 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[8px] font-black uppercase tracking-wider transition text-center shadow-sm"
                  >
                    Force Clear Session
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2.5 w-full pt-1.5">
                <button 
                  onClick={() => copyTableLink(table)} 
                  className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-650 transition flex items-center justify-center" 
                  title="Copy QR Menu URL"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => setPrintThemeModal({ show: true, table })} 
                  className="col-span-2 py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Card
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLE ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative border border-slate-200">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 text-xl font-bold">×</button>
            
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-slate-50 text-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {modalType === "add" ? "Create New Table" : "Edit Table Details"}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {modalType === "add" ? "Add a new table to your floor plan" : "Update table name or identifier"}
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[9px] font-black uppercase text-slate-450 tracking-widest pl-2">Table Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. Table 7 or VIP Lounge"
                  value={tableNameInput}
                  onChange={(e) => setTableNameInput(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-450 focus:outline-none focus:border-slate-800 transition"
                  autoFocus
                />
              </div>
              
              <button
                onClick={handleSaveTable}
                disabled={actionLoading}
                className="w-full py-4 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : modalType === "add" ? "Create Table" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  PREMIUM CUSTOM CONFIRMATION OVERLAY MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[2.2rem] p-8 w-full max-w-sm shadow-2xl relative border border-slate-100 text-slate-800 animate-slide-up">
            
            {/* Outline Warning / Action Icon */}
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-slate-900 text-center tracking-tight leading-none">
              {confirmModal.title}
            </h3>
            
            <p className="text-slate-500 text-xs font-semibold text-center leading-relaxed mt-3.5 mb-6.5">
              {confirmModal.message}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`py-3.5 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95 shadow-md ${confirmModal.confirmColor}`}
              >
                {confirmModal.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PRINT THEME SELECTOR MODAL */}
      {printThemeModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Choose Print Theme</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select a design for your QR table card</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { id: 'classic', label: 'Classic', bg: 'bg-white border-slate-900', text: 'text-slate-900', accent: 'bg-slate-900', desc: 'Clean & Minimal' },
                { id: 'dark', label: 'Dark', bg: 'bg-slate-900', text: 'text-white', accent: 'bg-[#ff5722]', desc: 'Bold & Modern' },
                { id: 'elegant', label: 'Elegant', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-900', accent: 'bg-gradient-to-r from-orange-500 to-amber-400', desc: 'Warm & Premium' },
              ].map(theme => (
                <button
                  key={theme.id}
                  onClick={() => { printTableCard(printThemeModal.table, theme.id); setPrintThemeModal({ show: false, table: null }); }}
                  className={`${theme.bg} border-2 rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md`}
                >
                  <div className="w-14 h-14 rounded-xl border border-current/10 flex flex-col items-center justify-center gap-1 overflow-hidden">
                    <div className={`w-8 h-1.5 rounded-full ${theme.accent}`} />
                    <div className="w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center">
                      <svg className={`w-5 h-5 ${theme.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4L4 8l8 4 8-4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4" /></svg>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black ${theme.text} uppercase tracking-wide`}>{theme.label}</span>
                  <span className={`text-[8px] font-bold ${theme.text} opacity-60`}>{theme.desc}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setPrintThemeModal({ show: false, table: null })}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
