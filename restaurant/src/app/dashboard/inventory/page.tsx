"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";

export default function InventoryManagement() {
  const [user, setUser] = useState(null);
  const [inventoryList, setInventoryList] = useState([]);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Form states for adding new ingredient
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    qty: "",
    unit: "kg",
    lowStockAlert: "5"
  });

  // Editing stock states
  const [editingItemId, setEditingItemId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editAlert, setEditAlert] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  //  Premium Toast and Custom Modal States
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    itemId: null,
    itemName: ""
  });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const triggerToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    
    // SOCKET.IO REAL-TIME CONNECTION
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("Inventory Socket Connected:", socket.id);
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

    socket.on("inventory_updated", () => {
      fetchInventory(currentPage, true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchInventory(currentPage);
  }, [currentPage]);

  const fetchInventory = async (page = 1, isSilent = false) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory?page=${page}&limit=20`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setInventoryList(json.data || []);
        if (json.pagination) setPaginationMeta(json.pagination);
      }
    } catch (error) {
      console.error("Failed to load inventory:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Add new raw ingredient
  const handleAddIngredient = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          itemName: formData.itemName,
          qty: parseFloat(formData.qty),
          unit: formData.unit,
          lowStockAlert: parseFloat(formData.lowStockAlert)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add raw ingredient.");
      }

      triggerToast(`Ingredient "${formData.itemName}" registered successfully!`, "success");
      setFormData({ itemName: "", qty: "", unit: "kg", lowStockAlert: "5" });
      setShowAddForm(false);
      fetchInventory();

    } catch (error) {
      setFormError(error.message);
      triggerToast(error.message, "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Save stock adjustment
  const handleSaveAdjustment = async (itemId) => {
    const token = localStorage.getItem("authToken");
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          qty: parseFloat(editQty),
          lowStockAlert: parseFloat(editAlert)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to adjust stock.");
      }

      setInventoryList(inventoryList.map(item => 
        item.id === itemId 
          ? { ...item, qty: parseFloat(editQty), lowStockAlert: parseFloat(editAlert) } 
          : item
      ));

      setEditingItemId(null);
      setEditQty("");
      setEditAlert("");
      triggerToast("Inventory level adjusted successfully.", "success");

    } catch (error) {
      triggerToast(error.message, "error");
    }
  };

  const triggerDeleteConfirm = (itemId, itemName) => {
    setConfirmModal({
      show: true,
      itemId,
      itemName
    });
  };

  // Delete raw ingredient from catalog
  const executeDeleteIngredient = async () => {
    const { itemId } = confirmModal;
    setConfirmModal({ show: false, itemId: null, itemName: "" });
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/${itemId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove ingredient.");
      }

      setInventoryList(inventoryList.filter(item => item.id !== itemId));
      triggerToast("Ingredient removed from ledger.", "success");

    } catch (error) {
      triggerToast(error.message, "error");
    }
  };

  if (loading) {
    return <LoadingScreen message="Syncing inventory ledger..." minHeight="50vh" />;
  }

  // Calculate high level metrics
  const lowStockItems = inventoryList.filter(item => item.qty <= item.lowStockAlert);

  return (
    <div className="space-y-8 animate-fade-in relative text-slate-800 font-sans">
      
      {/* Toast Alert Feedback */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up border ${
          toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-750" : "bg-slate-900 border-slate-700 text-white"
        }`}>
          <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-current animate-pulse" />
          <span className="text-[11px] font-black tracking-wide uppercase">{toast.msg}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-100 pb-6 text-left">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recipe &amp; Raw Inventory</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            Manage raw kitchen catalog and configure dynamic alerts on low levels
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-5 py-3 font-extrabold rounded-2xl text-[10px] uppercase tracking-wider shadow-md transition whitespace-nowrap active:scale-95 ${
            showAddForm 
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700" 
              : "bg-slate-900 hover:bg-slate-850 text-white"
          }`}
        >
          {showAddForm ? "Close Form" : "Register Raw Stock"}
        </button>
      </div>

      {/* high level metrics cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center gap-4 shadow-xl shadow-slate-100/40">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Raw Items</span>
            <span className="text-xl font-black text-slate-950">{inventoryList.length} Ingredients</span>
          </div>
        </div>

        <div className={`border p-6 rounded-3xl flex items-center gap-4 shadow-xl shadow-slate-100/40 ${
          lowStockItems.length > 0 ? "bg-rose-50/40 border-rose-200" : "bg-white border-slate-100"
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            lowStockItems.length > 0 ? "bg-rose-100 border border-rose-200 text-rose-600 animate-pulse" : "bg-slate-100 border border-slate-200 text-slate-500"
          }`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Low Stock Alerts</span>
            <span className={`text-xl font-black ${lowStockItems.length > 0 ? "text-rose-600" : "text-slate-950"}`}>
              {lowStockItems.length} Warnings
            </span>
          </div>
        </div>
      </div>

      {/* REGISTER NEW RAW STOCK FORM */}
      {showAddForm && (
        <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-100/60 max-w-xl animate-slide-up space-y-6 text-left">
          <div>
            <h3 className="font-black text-slate-900 text-lg">Register New Raw Stock Item</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Define measurement systems and default safety alert parameters</p>
          </div>
          
          <form onSubmit={handleAddIngredient} className="space-y-5 text-xs font-bold text-slate-600">
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Ingredient Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cottage Paneer Blocks"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Measurement Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl text-slate-800 text-xs font-black focus:outline-none transition"
                  required
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="ltr">Liters (ltr)</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="pkt">Packets (pkt)</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Initial Stock Qty</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 50.00"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Low Stock Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 10.00"
                  value={formData.lowStockAlert}
                  onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-4 px-4 rounded-2xl text-[10px] uppercase tracking-wider transition disabled:opacity-50 active:scale-95 shadow-md mt-2"
            >
              {formLoading ? "Saving Ingredient..." : "Register Ingredient"}
            </button>

          </form>
        </div>
      )}

      {/* INVENTORY DATA TABLE */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-100/40">
        
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-950 text-base">Raw Stocks Audit Ledger</h3>
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[9px] font-black uppercase text-slate-500 tracking-wider">
            {inventoryList.length} Items Listed
          </span>
        </div>

        {inventoryList.length === 0 ? (
          <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-sm leading-none">No raw ingredients tracked</h4>
              <p className="text-slate-400 text-[10px] font-semibold leading-relaxed pt-1.5">
                Add your first stock item (e.g. Paneer or Basmati) using the button above.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-bold text-slate-600 bg-white">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                  <th className="p-5 pl-8">Ingredient Name</th>
                  <th className="p-5">Current Stock Level</th>
                  <th className="p-5">Alert Level</th>
                  <th className="p-5 text-center">Stock status</th>
                  <th className="p-5 text-right pr-8">Manage Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {inventoryList.map((item) => {
                  const isLow = item.qty <= item.lowStockAlert;
                  const isEditing = editingItemId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition">
                      
                      {/* Name */}
                      <td className="p-5 pl-8 font-black text-slate-900 text-sm leading-snug">
                        {item.itemName}
                      </td>

                      {/* Current Stock */}
                      <td className="p-5">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg text-slate-800 text-xs focus:outline-none transition"
                            />
                            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">{item.unit}</span>
                          </div>
                        ) : (
                          <span className={`text-sm ${isLow ? "text-rose-600 font-extrabold" : "text-slate-800 font-black"}`}>
                            {item.qty.toFixed(2)} {item.unit}
                          </span>
                        )}
                      </td>

                      {/* Alert Level */}
                      <td className="p-5">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={editAlert}
                              onChange={(e) => setEditAlert(e.target.value)}
                              className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg text-slate-800 text-xs focus:outline-none transition"
                            />
                            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">{item.unit}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold">{item.lowStockAlert.toFixed(2)} {item.unit}</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="p-5 text-center">
                        {isLow ? (
                          <span className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-100 text-[9px] text-rose-600 uppercase font-black flex items-center justify-center gap-1.5 w-24 mx-auto animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[9px] text-emerald-700 uppercase font-black flex items-center justify-center gap-1.5 w-24 mx-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Healthy
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-5 text-right pr-8">
                        {isEditing ? (
                          <div className="flex justify-end gap-3.5">
                            <button
                              onClick={() => handleSaveAdjustment(item.id)}
                              className="text-emerald-600 hover:text-emerald-750 font-black uppercase text-[10px] tracking-wider"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="text-slate-400 hover:text-slate-500 font-black uppercase text-[10px] tracking-wider"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-4">
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditQty(item.qty.toString());
                                setEditAlert(item.lowStockAlert.toString());
                              }}
                              className="text-slate-800 hover:text-emerald-600 font-black uppercase text-[10px] tracking-wider"
                            >
                              Adjust Stock
                            </button>
                            {user.role === "owner" && (
                              <button
                                onClick={() => triggerDeleteConfirm(item.id, item.itemName)}
                                className="text-rose-500 hover:text-rose-600 font-black uppercase text-[10px] tracking-wider"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {paginationMeta.totalPages > 1 && inventoryList.length > 0 && (
          <div className="p-5 pl-8 pr-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Showing Page {currentPage} of {paginationMeta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-650 hover:bg-slate-50 transition disabled:opacity-50 active:scale-95"
              >
                Previous
              </button>
              <button
                disabled={currentPage === paginationMeta.totalPages}
                onClick={() => setCurrentPage(prev => Math.min(paginationMeta.totalPages, prev + 1))}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-650 hover:bg-slate-50 transition disabled:opacity-50 active:scale-95"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/*  PREMIUM CUSTOM CONFIRMATION OVERLAY MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[2.2rem] p-8 w-full max-w-sm shadow-2xl relative border border-slate-100 text-slate-800 animate-slide-up text-center">
            
            {/* Outline Box Icon */}
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              Remove Ingredient
            </h3>
            
            <p className="text-slate-550 text-xs font-semibold leading-relaxed mt-3.5 mb-6.5">
              Are you sure you want to permanently delete &quot;{confirmModal.itemName}&quot;? This action cannot be undone.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, itemId: null, itemName: "" })}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteIngredient}
                className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95 shadow-md"
              >
                Delete Stock
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
