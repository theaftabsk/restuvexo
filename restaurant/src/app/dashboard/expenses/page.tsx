"use client";

import { getBackendUrl, getSocketUrl } from "@/config/api";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Plus, Trash2, IndianRupee, PieChart, Activity, Calendar } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

export default function ExpensesManager() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Form State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Kitchen Ops");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const BACKEND_URL = getBackendUrl();

  useEffect(() => {
    fetchExpensesData();

    // Setup Real-time WebSocket connection
    const token = localStorage.getItem("authToken");
    let socket: any;
    if (token) {
      try {
        const user = JSON.parse(atob(token.split(".")[1]));
        socket = io(getSocketUrl(), {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
          timeout: 10000
        });

        socket.on("connect_error", () => {});
        
        socket.on("connect", () => {
          socket.emit("join_restaurant", user.restaurantId);
        });

        socket.on("reports_updated", () => {
          fetchExpensesData();
        });
      } catch (err) {
        console.error("Socket error:", err);
      }
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const fetchExpensesData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }
    try {
      setFetchError(false);
      const res = await fetch(`${BACKEND_URL}/api/expenses?limit=500`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.data || []);
      } else {
        // API returned error (e.g. 500) — still exit loading
        console.error("Expenses API error:", res.status);
        setFetchError(true);
      }
    } catch (error) {
      console.error("Failed to load expenses:", error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: any) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          category: category,
          amount: parseFloat(amount),
          date: date
        })
      });

      if (res.ok) {
        await fetchExpensesData();
        setTitle("");
        setAmount("");
        setDate(new Date().toISOString().split("T")[0]);
        setShowExpenseModal(false);
      } else {
        const err = await res.json();
        alert(`Failed: ${err.message}`);
      }
    } catch (error) {
      alert("Error adding expense");
    }
  };

  const handleDeleteExpense = async (id: any) => {
    if (!confirm("Are you sure you want to delete this expense? This will recalculate the entire profit ledger.")) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/expenses/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchExpensesData();
      }
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  
  if (loading) {
    return <LoadingScreen message="Syncing expense ledger..." minHeight="50vh" />;
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-5 text-center p-6">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg">Could not load expenses</h3>
          <p className="text-slate-400 text-xs font-semibold mt-1">Server is temporarily unavailable. Please try again.</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchExpensesData(); }}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition active:scale-95 shadow-md"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Overview Cards matching Orders Manager style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL EXPENDITURE</p>
          <h3 className="text-3xl font-black text-slate-900">₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <div className="mt-3 inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-bold w-fit">
            <Activity className="w-3 h-3" />
            OPERATIONAL COST
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL ENTRIES</p>
          <h3 className="text-3xl font-black text-slate-900">{expenses.length} Records</h3>
          <div className="mt-3 inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold w-fit">
            <PieChart className="w-3 h-3" />
            ALL CATEGORIES
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Table Header with Action Button */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex bg-white border border-slate-200 rounded-full p-1 shadow-sm">
              <button className="px-5 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all bg-slate-900 text-white shadow-md">
                ALL
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ff5722] hover:bg-[#ff7a47] text-white text-xs font-black tracking-widest uppercase rounded-full shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              LOG EXPENSE
            </button>
          </div>
        </div>
        
        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">TITLE</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CATEGORY</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">AMOUNT</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">DATE</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 text-sm font-semibold">Loading records...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 text-sm font-semibold">No expenses recorded yet.</td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-800">{exp.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black tracking-widest uppercase rounded-full border border-slate-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">
                        ₹{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4 opacity-50" />
                      {new Date(exp.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden transform transition-all scale-100 animate-in zoom-in-95">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-white">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#ff5722]/10 flex items-center justify-center text-[#ff5722]">
                  <IndianRupee className="w-4 h-4" />
                </div>
                Record New Expense
              </h2>
              <p className="text-xs text-slate-500 mt-2 font-medium">Add a new operational cost to your ledger.</p>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-6 md:p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expense Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Internet Bill, Chef Salary"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff5722]/20 focus:border-[#ff5722] transition-all placeholder:text-slate-400 placeholder:font-medium"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff5722]/20 focus:border-[#ff5722] transition-all appearance-none"
                  >
                    <option value="Kitchen Ops">Kitchen Ops</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Rent & Power">Rent & Power</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-black focus:outline-none focus:ring-2 focus:ring-[#ff5722]/20 focus:border-[#ff5722] transition-all placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff5722]/20 focus:border-[#ff5722] transition-all"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-6 py-3 text-xs text-slate-500 font-black uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#ff5722] hover:bg-[#ff7a47] text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-lg shadow-orange-500/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
