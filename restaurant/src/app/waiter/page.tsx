"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Bell, ChevronLeft, ChevronRight, CheckCircle, RefreshCw, AlertTriangle, Users } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

export default function WaiterFloorSeating() {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Relocate table dialog
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingOrder, setMovingOrder] = useState<any | null>(null);
  const [targetTableId, setTargetTableId] = useState("");

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

      const orderRes = await fetch(`${BACKEND_URL}/api/order`, {
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
    const interval = setInterval(fetchFloorSeating, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleEditItems = (order: any) => {
    localStorage.setItem("editOrderId", order.id.toString());
    localStorage.setItem("editOrderTable", order.tableId?.toString() || "");
    localStorage.setItem("editOrderType", order.orderType);
    localStorage.setItem("editOrderItems", JSON.stringify(order.orderItems));
    router.push("/dashboard/orders/create");
  };

  const handleMoveTableClick = (order: any) => {
    setMovingOrder(order);
    setTargetTableId("");
    setShowMoveDialog(true);
  };

  const executeMoveTable = async () => {
    if (!movingOrder || !targetTableId) return;
    setActionLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/order/${movingOrder.id}/move-table`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ targetTableId })
      });
      if (res.ok) {
        setShowMoveDialog(false);
        setMovingOrder(null);
        fetchFloorSeating();
      } else {
        alert("Failed to relocate table. Verify target is free.");
      }
    } catch (err) {
      console.error("Move table failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Syncing Captain Station..." minHeight="60vh" />;
  }

  // Get active floor occupied tables (any table that has unpaid orders)
  const activeOrdersMap = allOrders.filter(o => o.paymentStatus === "unpaid" && !o.isMerged);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-800">
      
      {/* Header Info Banner */}
      <div className="bg-[#fff9f6] border border-orange-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs font-semibold text-orange-850">
          Free plan — unlock POS, Kitchen & customer ordering. First month @ ₹1!
        </p>
        <button className="bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition shadow-md shadow-orange-500/10">
          Upgrade
        </button>
      </div>

      {/* Main Title Section */}
      <div className="flex flex-wrap items-center justify-between gap-6 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Captain's Station</h1>
          <p className="text-slate-500 text-xs font-semibold mt-0.5">Approve orders and manage floor service.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/dashboard/orders/create")}
            className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest px-5 py-3.5 rounded-xl flex items-center gap-2 transition shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Take Order</span>
          </button>
          <button className="px-5 py-3.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 text-xs font-bold flex items-center gap-2 transition">
            <Bell className="w-4 h-4" />
            <span>0 Alerts</span>
          </button>
        </div>
      </div>

      {/* ACTIVE FLOOR STATUS Table Slider Cards */}
      <div className="space-y-4">
        <h2 className="text-slate-900 font-black text-xs uppercase tracking-wider">Active Floor Status</h2>
        
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Table Cards Slider */}
          <div className="flex-1 flex gap-4 overflow-x-auto py-2 scrollbar-none">
            {tables.map(table => {
              const activeOrder = activeOrdersMap.find(o => o.tableId === table.id);
              return (
                <div 
                  key={table.id}
                  className="bg-white border border-slate-200 p-5 rounded-[1.75rem] w-[210px] shrink-0 space-y-4 flex flex-col justify-between hover:shadow-md transition duration-200"
                >
                  <div className="text-center space-y-1">
                    <h3 className="text-slate-900 font-black text-sm">{table.tableNo}</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      {activeOrder ? "1 ORDERS" : "FREE TABLE"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {activeOrder ? (
                      <>
                        <button
                          onClick={() => handleEditItems(activeOrder)}
                          className="w-full text-center py-2 border border-slate-200 bg-white hover:bg-slate-50 text-[#ff5722] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          + Edit / Add Items
                        </button>
                        <button
                          onClick={() => handleMoveTableClick(activeOrder)}
                          className="w-full text-center py-2 border border-slate-200 bg-white hover:bg-slate-50 text-[#2563eb] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Change Table
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          localStorage.setItem("editOrderTable", table.id.toString());
                          router.push("/dashboard/orders/create");
                        }}
                        className="w-full text-center py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Assign Seating
                      </button>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[8px] uppercase tracking-widest font-black">
                      {activeOrder ? "Occupied" : "Guest"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid for Incoming Approvals & Floor Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        
        {/* INCOMING APPROVALS */}
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[220px]">
          <h3 className="text-slate-900 font-black text-xs uppercase tracking-wider pb-4 border-b border-slate-50 flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span>Incoming Approvals</span>
          </h3>

          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="w-12 h-12 text-[#ff5722] opacity-20 mb-2" />
            <p className="text-slate-900 font-bold text-xs">No pending customer approvals.</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Table self-orders will request authentication here.</p>
          </div>
        </div>

        {/* FLOOR ALERTS */}
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[220px]">
          <h3 className="text-slate-900 font-black text-xs uppercase tracking-wider pb-4 border-b border-slate-50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span>Floor Alerts</span>
          </h3>

          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 opacity-20 mb-2" />
            <p className="text-slate-900 font-bold text-xs">All tables are happy.</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">No pending assistance or bill request callouts.</p>
          </div>
        </div>

      </div>

      {/* Move Table Dialog */}
      {showMoveDialog && movingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-250 p-6.5 rounded-[2.5rem] w-full max-w-sm space-y-4 shadow-2xl animate-scale-up text-slate-900">
            <div className="text-center space-y-1">
              <h4 className="font-black text-slate-900 text-lg">Change Table</h4>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Select destination table to relocate ongoing active order.</p>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-700">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Destination Dining Table</label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 bg-slate-50 font-bold focus:outline-none text-slate-950 rounded-xl"
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
                  onClick={() => { setShowMoveDialog(false); setMovingOrder(null); }}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={executeMoveTable}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs transition"
                >
                  Relocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
