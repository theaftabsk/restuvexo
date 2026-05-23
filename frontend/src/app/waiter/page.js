"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WaiterFloorSeating() {
  const router = useRouter();
  const [tables, setTables] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const fetchFloorSeating = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    
    try {
      const tableRes = await fetch(`${BACKEND_URL}/api/tables`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (tableRes.ok) {
        const tablesData = await tableRes.json();
        setTables(tablesData);
      }

      const orderRes = await fetch(`${BACKEND_URL}/api/orders?limit=100`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (orderRes.ok) {
        const json = await orderRes.json();
        setAllOrders(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load seating map:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorSeating();
    
    // Minor automatic update every 12 seconds to capture offline updates silently
    const interval = setInterval(fetchFloorSeating, 12000);
    return () => clearInterval(interval);
  }, []);

  const selectActiveTable = (table) => {
    router.push(`/waiter/order?tableId=${table.id}`);
  };

  const occupiedTablesCount = tables.filter(t => allOrders.some(o => o.tableId === t.id && ["pending", "cooking", "ready"].includes(o.status))).length;
  const freeTablesCount = Math.max(0, tables.length - occupiedTablesCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-[#ff5722] border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-black uppercase tracking-wider">Syncing Seating Grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      
      {/* Seating Stats widget */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-[2rem] shadow-sm text-center">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Tables</span>
          <span className="text-xl md:text-2xl font-black text-slate-900 block mt-1">{tables.length}</span>
        </div>
        <div className="bg-rose-50 border border-rose-100/50 p-4 rounded-[2rem] shadow-sm text-center">
          <span className="text-[8px] font-black text-rose-450 uppercase tracking-widest block">Active Guests</span>
          <span className="text-xl md:text-2xl font-black text-rose-600 block mt-1">{occupiedTablesCount}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100/50 p-4 rounded-[2rem] shadow-sm text-center">
          <span className="text-[8px] font-black text-emerald-450 uppercase tracking-widest block">Empty Tables</span>
          <span className="text-xl md:text-2xl font-black text-emerald-600 block mt-1">{freeTablesCount}</span>
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="bg-white border border-slate-150 p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/40 space-y-6">
        <div className="text-left border-b border-slate-50 pb-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider"> Select Seating Floor Plan</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Tap on a table below to immediately take orders or view its ongoing cart</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map(t => {
            const activeOrder = allOrders.find(o => o.tableId === t.id && ["pending", "cooking", "ready"].includes(o.status));
            const isOccupied = !!activeOrder;

            return (
              <button
                key={t.id}
                onClick={() => selectActiveTable(t)}
                className={`p-5 rounded-[2.2rem] border-2 transition-all duration-300 flex flex-col items-center justify-between text-center min-h-[145px] relative group hover:scale-[1.03] ${
                  isOccupied 
                    ? 'bg-rose-50/40 border-rose-200 occupied-glow' 
                    : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl"></span>
                
                <div>
                  <span className="text-xs font-black text-slate-900 block">Table {t.tableNo}</span>
                  <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Cap: {t.capacity || 4} Guests</span>
                </div>

                <div className="mt-3">
                  {isOccupied ? (
                    <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-[8px] font-black uppercase tracking-wider animate-pulse">
                      Active KOT
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-600 rounded-full text-[8px] font-black uppercase tracking-wider transition">
                      Free Table
                    </span>
                  )}
                </div>

                {isOccupied && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
