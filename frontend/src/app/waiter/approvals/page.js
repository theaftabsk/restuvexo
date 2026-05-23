"use client";

import { useEffect, useState } from "react";

export default function WaiterQrApprovals() {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const fetchQrApprovals = async () => {
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
    fetchQrApprovals();
    const interval = setInterval(fetchQrApprovals, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveQrOrder = async (orderId) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/approve`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchQrApprovals();
      }
    } catch (e) {
      console.error(e);
    }
  };



  const qrApprovals = Array.isArray(allOrders) ? allOrders.filter(order => 
    order.creator?.name === "QR Customer" && 
    order.status === "pending"
  ) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-[#ff5722] border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-black uppercase tracking-wider">Loading guest self-orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="text-left border-b border-slate-100 pb-3">
        <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Diner Self-Order Inbox</span>
        </h3>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 font-sans">Approve customer QR orders to send them straight to the kitchen</p>
      </div>

      {qrApprovals.length === 0 ? (
        <div className="bg-white border border-slate-200/80 p-16 text-center rounded-[2.5rem] max-w-md mx-auto space-y-4 shadow-xl">
          <span className="text-4xl block animate-pulse"></span>
          <h3 className="font-black text-slate-900">Approvals Inbox Clear</h3>
          <p className="text-slate-500 text-xs font-semibold">Incoming visitor self-orders will appear here instantly for waiter approval.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrApprovals.map(order => (
            <div key={order.id} className="bg-white border-2 border-orange-200 p-5.5 rounded-[2.2rem] flex flex-col justify-between gap-5 shadow-xl relative overflow-hidden transition-all duration-300">
              
              <div className="space-y-3.5 text-left">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase">Self-Order #{order.id}</span>
                    <h4 className="font-black text-slate-900 text-sm leading-none pt-0.5"> Table {order.table?.tableNo || "Guest Table"}</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider bg-orange-50 border border-orange-100 text-orange-600 animate-pulse">
                    Awaiting Approvals
                  </span>
                </div>

                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                   Sent: {new Date(order.createdAt).toLocaleTimeString()}
                </div>

                <ul className="space-y-2 text-[10px] font-bold text-slate-700">
                  {order.orderItems.map((item, idx) => (
                    <li key={idx} className="flex flex-col gap-0.5 bg-slate-50/50 p-2.5 border border-slate-100 rounded-2xl">
                      <div className="flex justify-between">
                        <span>• {item.menuItem?.name}</span>
                        <span className="font-black text-xs text-rose-500">x{item.qty}</span>
                      </div>
                      {item.note && (
                        <p className="text-[8px] text-slate-400 italic font-semibold ml-2.5"> Chef Note: {item.note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleApproveQrOrder(order.id)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition active:scale-95 shadow-md"
                >
                   Approve
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
