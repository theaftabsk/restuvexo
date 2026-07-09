"use client";

import { useEffect, useState } from "react";

export default function WaiterKotsTracker() {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const fetchKotsFeed = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const orderRes = await fetch(`${BACKEND_URL}/api/orders?limit=100`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (orderRes.ok) {
        const json = await orderRes.json();
        setAllOrders(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKotsFeed();
    const interval = setInterval(fetchKotsFeed, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkServed = async (orderId) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "completed" })
      });
      if (res.ok) {
        fetchKotsFeed();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const myKots = Array.isArray(allOrders) ? allOrders.filter(order => {
    const isUnapprovedQr = order.creator?.name === "QR Customer";
    return !isUnapprovedQr && ["pending", "cooking", "ready"].includes(order.status);
  }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-[#ff5722] border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-black uppercase tracking-wider">Syncing live KOT feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="text-left border-b border-slate-105 pb-3">
        <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <span>Live Floor KOT Status Monitor</span>
        </h3>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 font-sans">Track live food preparation status. Serve food immediately when marked Ready</p>
      </div>

      {myKots.length === 0 ? (
        <div className="bg-white border border-slate-200/80 p-16 text-center rounded-[2.5rem] max-w-md mx-auto space-y-4 shadow-xl">
          <span className="text-4xl block animate-bounce"></span>
          <h3 className="font-black text-slate-900">All Table KOTs Served!</h3>
          <p className="text-slate-500 text-xs font-semibold">Kitchen feed is quiet. Start taking orders on the Floor Seating page.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myKots.map(order => {
            const statusLabels = {
              pending: { label: "Pending KOT", color: "bg-rose-50 border-rose-100 text-rose-600", beacon: "bg-rose-500" },
              cooking: { label: "Cooking Feed", color: "bg-amber-50 border-amber-100 text-amber-600", beacon: "bg-amber-500 animate-pulse" },
              ready: { label: "Dish Ready!", color: "bg-emerald-50 border-emerald-100 text-emerald-600 animate-bounce", beacon: "bg-emerald-500 animate-ping" }
            };
            const indicator = statusLabels[order.status] || { label: order.status, color: "bg-slate-50 border-slate-100 text-slate-650" };

            return (
              <div key={order.id} className={`bg-white border-2 p-5.5 rounded-[2.2rem] flex flex-col justify-between gap-5 shadow-xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${order.status === 'ready' ? 'border-emerald-400 ring-4 ring-emerald-100/60' : 'border-slate-200'}`}>
                
                <div className="space-y-3.5 text-left">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase">KOT #{order.id}</span>
                      <h4 className="font-black text-slate-900 text-sm leading-none pt-0.5"> Table {order.table?.tableNo || "Takeaway"}</h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider ${indicator.color} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${indicator.beacon}`} />
                      {indicator.label}
                    </span>
                  </div>

                  <ul className="space-y-2 text-[10px] font-bold text-slate-600">
                    {order.orderItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between bg-slate-50/50 p-2 border border-slate-100/65 rounded-xl">
                        <span>• {item.menuItem?.name}</span>
                        <span className="font-black text-rose-500">x{item.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  {order.status === "ready" ? (
                    <button
                      onClick={() => handleMarkServed(order.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition active:scale-95 shadow-lg shadow-emerald-500/10"
                    >
                       Serve & Clear Table
                    </button>
                  ) : (
                    <div className="w-full py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       Cooking in Kitchen
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
