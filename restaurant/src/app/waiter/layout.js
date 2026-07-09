"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";

export default function WaiterLayout({ children }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  
  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
  const socketRef = useRef(null);

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Voice alert synthesizer for persistent Floor audio notifications
  const playVoiceAlert = (text) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // High Fidelity Sound Generator
  const playChime = (frequency = 987.77, duration = 0.4) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + duration + 0.1);
    } catch (e) {
      console.log("Audio feedback bypassed:", e);
    }
  };

  const fetchLayoutOrders = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const orderRes = await fetch(`${BACKEND_URL}/api/orders?limit=100&_=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (orderRes.ok) {
        const json = await orderRes.json();
        setAllOrders(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      window.location.href = "/auth/login";
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    fetchLayoutOrders();
    
    // Connect persistent Live Socket Client
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(" Waiter Layout Socket Connected:", socket.id);
      if (parsedUser.restaurantId) {
        socket.emit("join_restaurant", parsedUser.restaurantId);
      }
    });

    socket.on("new_order_placed", (order) => {
      setAllOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        
        if (order.creator?.name === "QR Customer" && order.status === "pending") {
          const tableLabel = order.table?.tableNo ? (order.table.tableNo.toLowerCase().startsWith('table') ? order.table.tableNo : `Table ${order.table.tableNo}`) : "Guest";
          triggerToast(` New QR Self-Order from ${tableLabel}!`, "info");
          playChime(1046.50, 0.6);
          setTimeout(() => playChime(1318.51, 0.4), 150);
        }
        return [order, ...prev];
      });
    });

    socket.on("order_updated", (order) => {
      setAllOrders(prev => prev.map(o => o.id === order.id ? order : o));
    });

    socket.on("order_status_updated", (order) => {
      setAllOrders(prev => {
        const oldOrder = prev.find(o => o.id === order.id);
        
        // Voice announce on "Ready" status from ANY page
        if (oldOrder && oldOrder.status !== "ready" && order.status === "ready") {
          const tableText = order.table?.tableNo 
            ? (order.table.tableNo.toLowerCase().startsWith('table') ? order.table.tableNo : `Table ${order.table.tableNo}`) 
            : "Takeaway Order";
          playVoiceAlert(`Ready! Order number ${order.id} for ${tableText} is ready to serve.`);
          triggerToast(` serving hot! ${tableText} is ready!`, "success");
          playChime(1320, 0.5);
        }
        
        return prev.map(o => o.id === order.id ? order : o);
      });
    });

    socket.on("order_deleted", (payload) => {
      setAllOrders(prev => prev.filter(o => o.id !== payload.id));
    });

    // Slow backup syncing interval
    const interval = setInterval(fetchLayoutOrders, 60000);

    return () => {
      if (socket) socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Filter Active Waiter KOTs & QR Approvals
  const myKots = allOrders.filter(order => {
    const isUnapprovedQr = order.creator?.name === "QR Customer";
    return !isUnapprovedQr && ["pending", "cooking", "ready"].includes(order.status);
  });

  const qrApprovals = allOrders.filter(order => 
    order.creator?.name === "QR Customer" && 
    order.status === "pending"
  );

  const isFloor = pathname === "/waiter" || pathname.startsWith("/waiter/order");
  const isKots = pathname === "/waiter/kots";
  const isApprovals = pathname === "/waiter/approvals";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 font-sans">
      
      {/* Font & Stylesheet Injections */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{__html: `
        body { font-family: 'Outfit', sans-serif; }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 15px 5px rgba(239, 68, 68, 0.2); }
        }
        .occupied-glow { animation: pulseGlow 2.5s infinite; }
      `}} />

      {/* ========================================================
          GLOBAL GLASSMORPHIC TOAST NOTIFICATION
          ======================================================== */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in">
          <div className={`backdrop-blur-xl border px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-sm ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" 
              : toast.type === "error" 
                ? "bg-rose-500/10 border-rose-500/20 text-rose-700" 
                : "bg-slate-900 text-slate-100 border-slate-850"
          }`}>
            <span className="text-lg">
              {toast.type === "success" ? "" : toast.type === "error" ? "" : ""}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black tracking-wide leading-relaxed">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          A. FLOATING BOTTOM APP NAVIGATION SHELL
          ======================================================== */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-3 z-50 shadow-2xl flex justify-around items-center max-w-md mx-auto rounded-t-[2.2rem]">
        <Link
          href="/waiter"
          onClick={() => playChime(1318.51, 0.05)}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition ${isFloor ? 'text-[#ff5722] font-black' : 'text-slate-400 font-semibold'}`}
        >
          <span className="text-lg"></span>
          <span className="text-[9px] uppercase tracking-wider">Floor Seating</span>
        </Link>
        
        <Link
          href="/waiter/kots"
          onClick={() => playChime(1318.51, 0.05)}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition relative ${isKots ? 'text-[#ff5722] font-black' : 'text-slate-400 font-semibold'}`}
        >
          <span className="text-lg"></span>
          <span className="text-[9px] uppercase tracking-wider">KOT Feed</span>
          {myKots.length > 0 && (
            <span className="absolute top-0 right-3 bg-[#ff5722] text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
              {myKots.length}
            </span>
          )}
        </Link>

        <Link
          href="/waiter/approvals"
          onClick={() => playChime(1318.51, 0.05)}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition relative ${isApprovals ? 'text-[#ff5722] font-black' : 'text-slate-400 font-semibold'}`}
        >
          <span className="text-lg"></span>
          <span className="text-[9px] uppercase tracking-wider">QR Approvals</span>
          {qrApprovals.length > 0 && (
            <span className="absolute top-0 right-3 bg-emerald-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white animate-bounce">
              {qrApprovals.length}
            </span>
          )}
        </Link>
      </div>

      {/* HEADER SECTION (HIDDEN ON CATALOG ORDER SCREEN FOR MAXIMUM SPACE) */}
      {!pathname.startsWith("/waiter/order") && (
        <div className="p-4 md:p-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 p-6 shadow-xl shadow-slate-100/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-5xl mx-auto">
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Floor Console Active</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
                Welcome, {user?.name || "Floor Host"} 
              </h1>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider mt-0.5">
                RESTUVEXO Restaurant floor कप्तान terminal
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end relative z-10">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/auth/login";
                }}
                className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl border border-rose-500/20 transition duration-300"
              >
                 Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Children Views */}
      <div className="relative z-10">
        {children}
      </div>

    </div>
  );
}
