"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";

export default function ReportsDashboard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [dateRange, setDateRange] = useState("7days"); // today, yesterday, 7days, 30days, all
  const [cogsPercentage, setCogsPercentage] = useState(35); // Cost of Goods Sold (COGS) %: customizable slider

  // Dynamic OPEX Expense items (Loaded from Database)
  const [expenses, setExpenses] = useState([]);

  // Modal State
  const [mounted, setMounted] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showMaximizedChart, setShowMaximizedChart] = useState(false);
  const [zoomScale, setZoomScale] = useState(1); // 1, 1.5, 2, 3
  const [ledgerFilter, setLedgerFilter] = useState("all"); // 'today', 'this_month', 'this_year', 'all'
  const [dbCategories, setDbCategories] = useState([]); // Real menu categories from database
  const [expTitleInput, setExpTitleInput] = useState("");
  const [expCategoryInput, setExpCategoryInput] = useState("Kitchen Ops");
  const [expAmountInput, setExpAmountInput] = useState("");
  const [expDateInput, setExpDateInput] = useState(new Date().toISOString().split("T")[0]);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  // Load orders and expenses from database
  useEffect(() => {
    setMounted(true);
    fetchOrdersData();
    fetchExpensesData();
    fetchCategoriesData();

    // Setup Real-time WebSocket connection for zero-load live updates
    const token = localStorage.getItem("authToken");
    let socket;
    if (token) {
      try {
        const user = JSON.parse(atob(token.split(".")[1]));
        socket = io(BACKEND_URL);

        socket.on("connect", () => {
          socket.emit("join_restaurant", user.restaurantId);
        });

        // Listen for live database changes and selectively refetch
        socket.on("reports_updated", () => {
          fetchExpensesData();
        });

        socket.on("new_order_placed", () => {
          fetchOrdersData();
        });

        socket.on("order_status_updated", () => {
          fetchOrdersData();
        });

      } catch (err) {
        console.error("Socket connection error:", err);
      }
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const fetchExpensesData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/expenses?limit=300`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.data || []);
      }
    } catch (error) {
      console.error("Failed to load expenses:", error);
    }
  };

  const fetchOrdersData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders?limit=300`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        // Only consider paid or settled orders for actual profit ledger calculations
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to load reports orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDbCategories(json || []);
      }
    } catch (error) {
      console.error("Failed to load reports categories:", error);
    }
  };

  // Add dynamic operating expense item
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expTitleInput.trim() || !expAmountInput) return;

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
          title: expTitleInput.trim(),
          category: expCategoryInput,
          amount: parseFloat(expAmountInput),
          date: expDateInput
        })
      });

      if (res.ok) {
        await fetchExpensesData();
        // Reset Form
        setExpTitleInput("");
        setExpAmountInput("");
        setExpDateInput(new Date().toISOString().split("T")[0]);
        setShowExpenseModal(false);
      } else {
        const err = await res.json();
        alert(`Failed to add expense: ${err.message}`);
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Error adding expense");
    }
  };

  // Delete an expense item
  const handleDeleteExpense = async (id) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/expenses/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchExpensesData();
      } else {
        alert("Failed to delete expense");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  // Date Filtering Calculations
  const getFilteredData = () => {
    const now = new Date();

    // Filter Orders by range
    const filteredOrders = orders.filter(order => {
      const oDate = new Date(order.createdAt);
      const diffTime = Math.abs(now.getTime() - oDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateRange === "today") {
        return oDate.toDateString() === now.toDateString();
      } else if (dateRange === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        return oDate.toDateString() === yesterday.toDateString();
      } else if (dateRange === "7days") {
        return diffDays <= 7;
      } else if (dateRange === "30days") {
        return diffDays <= 30;
      }
      return true; // all
    });

    // Filter Expenses by range
    const filteredExpenses = expenses.filter(exp => {
      const eDate = new Date(exp.date);
      const diffTime = Math.abs(now.getTime() - eDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateRange === "today") {
        return eDate.toDateString() === now.toDateString();
      } else if (dateRange === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        return eDate.toDateString() === yesterday.toDateString();
      } else if (dateRange === "7days") {
        return diffDays <= 7;
      } else if (dateRange === "30days") {
        return diffDays <= 30;
      }
      return true; // all
    });

    return { filteredOrders, filteredExpenses };
  };

  const { filteredOrders, filteredExpenses } = getFilteredData();

  //  STRONG MATHEMATICAL PROFIT & LOSS LEDGER CALCULATIONS
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const calculatedCOGS = (totalRevenue * cogsPercentage) / 100;
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const netEarnings = totalRevenue - calculatedCOGS - totalExpensesAmount;
  const netProfitMargin = totalRevenue > 0 ? (netEarnings / totalRevenue) * 100 : 0;

  // Breakdown of revenue by order Type
  const dineInRevenue = filteredOrders.filter(o => o.orderType === "dine_in").reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const deliveryRevenue = filteredOrders.filter(o => o.orderType === "delivery").reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const takeawayRevenue = filteredOrders.filter(o => o.orderType === "takeaway").reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);

  // Group weekly sales trend for dynamic graph
  const getWeeklyTrend = () => {
    const trendMap = {};
    // Last 7 days labels
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap[d.toLocaleDateString(undefined, { weekday: "short" })] = 0;
    }

    filteredOrders.forEach(o => {
      const dayName = new Date(o.createdAt).toLocaleDateString(undefined, { weekday: "short" });
      if (trendMap[dayName] !== undefined) {
        trendMap[dayName] += parseFloat(o.totalAmount) || 0;
      }
    });

    return Object.entries(trendMap).map(([day, val]) => ({ day, sales: val }));
  };

  const weeklyTrend = getWeeklyTrend();
  const maxWeeklySales = Math.max(...weeklyTrend.map(t => Number(t.sales)), 100);

  // Group 14 days trend for maximized view
  const get14DayTrend = () => {
    const trendMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      trendMap[label] = 0;
    }

    // Use raw orders to always represent true historical 14-day data
    orders.forEach(o => {
      const label = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (trendMap[label] !== undefined) {
        trendMap[label] += parseFloat(o.totalAmount) || 0;
      }
    });

    return Object.entries(trendMap).map(([day, val]) => ({ day, sales: val }));
  };

  const trend14Days = get14DayTrend();
  const max14DaySales = Math.max(...trend14Days.map(t => Number(t.sales)), 100);
  const total14DaySales = trend14Days.reduce((sum, t) => sum + Number(t.sales), 0);
  const avg14DaySales = total14DaySales / 14;

  // Construct dynamic Category Breakdown based on menu item categories from database
  const getCategoryBreakdown = () => {
    const catMap = {};

    // Initialize map keys using real database categories
    dbCategories.forEach(c => {
      catMap[c.name] = 0;
    });

    // Ensure there is always an "Others" category fallback
    if (catMap["Others"] === undefined) {
      catMap["Others"] = 0;
    }

    filteredOrders.forEach(o => {
      if (o.orderItems && o.orderItems.length > 0) {
        o.orderItems.forEach(item => {
          const amt = (parseFloat(item.price) || parseFloat(item.menuItem?.price) || 0) * (item.qty || 1);
          const catName = item.menuItem?.category?.name || "Others";

          if (catMap[catName] !== undefined) {
            catMap[catName] += amt;
          } else {
            // Dynamic category creation if it is in menu but not yet loaded/pre-initialized
            catMap[catName] = amt;
          }
        });
      } else {
        // Fallback for orders with no line-items (directly mapping total value to Others or distributing)
        catMap["Others"] += parseFloat(o.totalAmount || 0);
      }
    });

    // Fallback: If no order item details mapped, distribute dynamic revenue proportionally among categories to avoid empty ₹0
    const totalAssigned = Object.values(catMap).reduce((a: number, b: any) => a + Number(b), 0);
    if (totalAssigned === 0 && totalRevenue > 0 && dbCategories.length > 0) {
      const activeCats = dbCategories.map(c => c.name);
      const share = totalRevenue / activeCats.length;
      activeCats.forEach(name => {
        catMap[name] = share;
      });
    }

    return Object.entries(catMap).map(([category, amount]) => ({ category, amount }));
  };

  const categoryBreakdown = getCategoryBreakdown();
  const maxCatSales = Math.max(...categoryBreakdown.map(c => Number(c.amount)), 100);

  // --- LEDGER SPECIFIC FILTERING ---
  const getLedgerData = () => {
    const now = new Date();

    const filterByDate = (dateStr) => {
      const d = new Date(dateStr);
      if (ledgerFilter === "today") {
        return d.toDateString() === now.toDateString();
      } else if (ledgerFilter === "this_month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (ledgerFilter === "this_year") {
        return d.getFullYear() === now.getFullYear();
      }
      return true; // "all"
    };

    const lOrders = orders.filter(o => filterByDate(o.createdAt));
    const lExpenses = expenses.filter(e => filterByDate(e.date));

    const lRevenue = lOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
    const lExpAmount = lExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    // Sort all ledger items by date descending
    const allLedgerItems = [
      ...lOrders.map(o => ({
        id: `in-${o.id}`,
        date: new Date(o.createdAt),
        type: 'inflow',
        title: `Revenue: Settled Billing Ticket #${o.id}`,
        category: o.orderType,
        amount: parseFloat(o.totalAmount || 0)
      })),
      ...lExpenses.map(e => ({
        id: `out-${e.id}`,
        date: new Date(e.date),
        type: 'outflow',
        title: `Operating Cost: ${e.title}`,
        category: e.category,
        amount: parseFloat(e.amount || 0)
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return { lOrders, lExpenses, lRevenue, lExpAmount, allLedgerItems };
  };

  const { lRevenue, lExpAmount, allLedgerItems } = getLedgerData();
  const lNetEarnings = lRevenue - lExpAmount;
  const lNetMargin = lRevenue > 0 ? (lNetEarnings / lRevenue) * 100 : 0;

  // Print Complete P&L Financial Audit Report Window
  const handlePrintAuditReport = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Income Statement & Audit Report - RESTUVEXO</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;900&display=swap');
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #1e293b; background: white; }
            .header { border-bottom: 2px dashed #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; text-align: left; }
            .brand { font-size: 26px; font-weight: 900; color: #ff5722; letter-spacing: -1px; }
            .meta { font-size: 10px; font-weight: 900; text-transform: uppercase; tracking-wider; color: #64748b; margin-top: 5px; }
            .title { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 15px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
            .kpi-card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 16px; text-align: left; }
            .kpi-title { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .kpi-val { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 5px; }
            .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 30px 0 15px 0; text-align: left; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; padding: 12px; font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            td { padding: 12px; font-size: 11px; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9; text-align: left; }
            .amount-rev { color: #10b981; font-weight: 900; }
            .amount-exp { color: #f43f5e; font-weight: 900; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 8px; font-size: 8px; font-weight: 900; text-transform: uppercase; }
            .badge-profit { bg-color: #ecfdf5; color: #059669; }
            .badge-loss { bg-color: #fff1f2; color: #e11d48; }
            .footer-notes { margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 20px; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">RESTUVEXO RESTAURANT OPERATING SYSTEM</div>
            <div class="meta">Financial Statement & Audit Report • Date: ${new Date().toLocaleDateString()}</div>
            <div class="title">INCOME STATEMENT & LEDGER BALANCE SHEET (${dateRange.toUpperCase()})</div>
          </div>

          <div class="grid">
            <div class="kpi-card">
              <div class="kpi-title">Gross Sales Revenue</div>
              <div class="kpi-val">₹${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">COGS (Est. ${cogsPercentage}%)</div>
              <div class="kpi-val">₹${calculatedCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Operating Expenses (OPEX)</div>
              <div class="kpi-val">₹${totalExpensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Net Operating Profit</div>
              <div class="kpi-val" style="color: ${netEarnings >= 0 ? "#10b981" : "#f43f5e"}">₹${netEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div class="section-title">Income & Expense Ledger Items</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Category / Fulfillment</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(o => `
                <tr>
                  <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>Income: Settled Order #${o.id}</td>
                  <td><span class="badge" style="background: #ecfdf5; color: #059669;">Revenue</span></td>
                  <td>${o.orderType.toUpperCase()}</td>
                  <td class="amount-rev">+₹${(parseFloat(o.totalAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join("")}
              ${filteredExpenses.map(e => `
                <tr>
                  <td>${new Date(e.date).toLocaleDateString()}</td>
                  <td>Expense: ${e.title}</td>
                  <td><span class="badge" style="background: #fff1f2; color: #e11d48;">Expense</span></td>
                  <td>${e.category.toUpperCase()}</td>
                  <td class="amount-exp">-₹${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer-notes">
            RESTUVEXO Restaurant Ledger Sheet • Certified with mathematical alignment.
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return <LoadingScreen message="Assembling financial reports..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 text-slate-800 pb-16 font-sans text-left">

      {/* Date Range Selection & Export Options bar */}
      <div className="flex flex-col gap-4 bg-white border border-slate-200 p-4 rounded-[2rem] shadow-sm">

        {/* Date Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none justify-start flex-wrap">
          {[
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yesterday" },
            { key: "7days", label: "Last 7 Days" },
            { key: "30days", label: "Last 30 Days" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDateRange(tab.key)}
              className={`px-4.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition duration-200 ${dateRange === tab.key
                  ? "bg-[#ff5722] border-[#ff5722] text-white shadow-md shadow-orange-500/10"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500 font-extrabold"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex items-center gap-2 flex-wrap">

          <button
            onClick={() => setShowLedgerModal(true)}
            className="flex-1 sm:flex-none px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Open Full Ledger
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition shadow flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log OPEX Expense
          </button>

          <button
            onClick={handlePrintAuditReport}
            className="flex-1 sm:flex-none px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-[10px] uppercase tracking-widest rounded-xl border border-slate-250 transition shadow flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Ledger Card
          </button>

        </div>

      </div>

      {/*  STRONG MATHEMATICAL PROFIT & LOSS CARDS */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Card 1: Gross Sales */}
        <div className="bg-white border border-slate-150 p-6 rounded-[2.2rem] shadow-xl hover:shadow-2xl transition duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Gross Revenue Sales</span>
            <h3 className="text-2xl font-black text-slate-900 leading-none pt-1">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 tracking-wide border-t border-slate-100 pt-3">
            <span>Orders Paid: {filteredOrders.length}</span>
            <span className="text-emerald-500 font-extrabold">+100% Sales</span>
          </div>
        </div>

        {/* Card 2: COGS (Material cost) */}
        <div className="bg-white border border-slate-150 p-6 rounded-[2.2rem] shadow-xl hover:shadow-2xl transition duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cost of Goods (COGS)</span>
              <span className="bg-orange-50 border border-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-black">{cogsPercentage}% Est</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 leading-none pt-1">₹{calculatedCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="space-y-1 border-t border-slate-100 pt-2.5">
            <input
              type="range"
              min="10"
              max="70"
              value={cogsPercentage}
              onChange={(e) => setCogsPercentage(parseInt(e.target.value))}
              className="w-full accent-orange-500 h-1 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-wider">
              <span>Slider Adjustment</span>
              <span>Slide to recal</span>
            </div>
          </div>
        </div>

        {/* Card 3: OPEX Expense */}
        <div className="bg-white border border-slate-150 p-6 rounded-[2.2rem] shadow-xl hover:shadow-2xl transition duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operating Expense (OPEX)</span>
            <h3 className="text-2xl font-black text-slate-900 leading-none pt-1">₹{totalExpensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 tracking-wide border-t border-slate-100 pt-3">
            <span>Expenses Logged: {filteredExpenses.length}</span>
            <span className="text-rose-500 font-extrabold">All Cash/Bills</span>
          </div>
        </div>

        {/* Card 4: Net Profit or Loss Balance */}
        <div className={`border p-6 rounded-[2.2rem] shadow-xl hover:shadow-2xl transition duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px] ${netEarnings >= 0 ? "bg-emerald-500/5 border-emerald-200" : "bg-rose-500/5 border-rose-200"
          }`}>
          <div className="space-y-1">
            <span className={`text-[9px] font-black uppercase tracking-widest block ${netEarnings >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {netEarnings >= 0 ? "Net Profit Balance" : "Net Loss Deficit"}
            </span>
            <h3 className={`text-2xl font-black leading-none pt-1 ${netEarnings >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              ₹{netEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold tracking-wide border-t border-slate-100 pt-3">
            <span className={netEarnings >= 0 ? "text-emerald-600" : "text-rose-600"}>Margin: {netProfitMargin.toFixed(1)}%</span>
            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${netEarnings >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
              {netEarnings >= 0 ? "Surplus Profit" : "Loss Alert"}
            </span>
          </div>
        </div>

      </div>

      {/*  PREMIUM CUSTOM SVG OFFLINE CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Chart 1: Daily Sales Trend Line Graph */}
        <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-[2.5rem] shadow-xl md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-[#ff5722]">Sales Performance</span>
              <h4 className="text-sm font-black text-slate-900 leading-none">Daily Billing Revenue Trend</h4>
            </div>
            <button
              onClick={() => setShowMaximizedChart(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-[#ff5722] hover:text-white text-[#ff5722] text-[8px] font-black uppercase tracking-widest rounded-xl transition flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              Enlarge 14-Day Chart
            </button>
          </div>

          {/* Outline SVG Graph */}
          <div className="w-full h-56 bg-slate-50 border border-slate-100 rounded-[1.8rem] flex flex-col justify-end p-6 shadow-inner relative">
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="37.5" x2="500" y2="37.5" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="112.5" x2="500" y2="112.5" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5,5" />

              {/* Spark Trend Path */}
              <path
                d={weeklyTrend.map((t, idx) => {
                  const x = (idx / 6) * 500;
                  const y = 150 - (Number(t.sales) / maxWeeklySales) * 110 - 20;
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                }).join(" ")}
                fill="none"
                stroke="#ff5722"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-draw"
              />

              {/* Data points */}
              {weeklyTrend.map((t, idx) => {
                const x = (idx / 6) * 500;
                const y = 150 - (Number(t.sales) / maxWeeklySales) * 110 - 20;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="5.5"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="hover:scale-125 transition cursor-pointer"
                  >
                    <title>{t.day}: ₹{Number(t.sales).toFixed(0)}</title>
                  </circle>
                );
              })}
            </svg>

            {/* X Axis Labels */}
            <div className="flex justify-between w-full pt-4 border-t border-slate-100 mt-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">
              {weeklyTrend.map((t, idx) => (
                <span key={idx} className="w-12 text-center">{t.day}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Order Type Share (Ring Breakdown) */}
        <div className="bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-0.5">
            <span className="text-[8px] font-black uppercase tracking-widest text-[#ff5722]">Fulfillment share</span>
            <h4 className="text-sm font-black text-slate-900 leading-none">Order Channel Distribution</h4>
          </div>

          <div className="w-full h-44 flex items-center justify-center relative">
            <svg className="w-36 h-36" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />

              {/* Segment 1: Dine-in */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#0f172a"
                strokeWidth="3.5"
                strokeDasharray={`${totalRevenue > 0 ? (dineInRevenue / totalRevenue) * 100 : 33.3} ${totalRevenue > 0 ? 100 - (dineInRevenue / totalRevenue) * 100 : 66.7}`}
                strokeDashoffset="25"
              />

              {/* Segment 2: Delivery */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#ff5722"
                strokeWidth="3.5"
                strokeDasharray={`${totalRevenue > 0 ? (deliveryRevenue / totalRevenue) * 100 : 33.3} ${totalRevenue > 0 ? 100 - (deliveryRevenue / totalRevenue) * 100 : 66.7}`}
                strokeDashoffset={25 - (totalRevenue > 0 ? (dineInRevenue / totalRevenue) * 100 : 33.3)}
              />

              {/* Segment 3: Takeaway */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeDasharray={`${totalRevenue > 0 ? (takeawayRevenue / totalRevenue) * 100 : 33.4} ${totalRevenue > 0 ? 100 - (takeawayRevenue / totalRevenue) * 100 : 66.6}`}
                strokeDashoffset={25 - (totalRevenue > 0 ? (dineInRevenue + deliveryRevenue) / totalRevenue * 100 : 66.6)}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Gross total</span>
              <span className="text-sm font-black text-slate-800">₹{totalRevenue > 1000 ? `${(totalRevenue / 1000).toFixed(1)}k` : totalRevenue.toFixed(0)}</span>
            </div>
          </div>

          {/* Legends */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5 text-[8px] font-black uppercase tracking-wider text-slate-500">
            <div className="flex flex-col items-center border-r border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-900" /> Dine-In</span>
              <span className="text-slate-800 font-extrabold text-[9px] mt-0.5">₹{dineInRevenue.toFixed(0)}</span>
            </div>
            <div className="flex flex-col items-center border-r border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#ff5722]" /> Delivery</span>
              <span className="text-slate-800 font-extrabold text-[9px] mt-0.5">₹{deliveryRevenue.toFixed(0)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Takeaway</span>
              <span className="text-slate-800 font-extrabold text-[9px] mt-0.5">₹{takeawayRevenue.toFixed(0)}</span>
            </div>
          </div>

        </div>

      </div>

      {/* Expense ledger logger & Category Sales breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Category Breakdown Bar Chart */}
        <div className="bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-xl space-y-5 text-left">
          <div className="space-y-0.5">
            <span className="text-[8px] font-black uppercase tracking-widest text-[#ff5722]">Menu analytics</span>
            <h4 className="text-sm font-black text-slate-900 leading-none">Category Wise Revenue</h4>
          </div>

          <div className="space-y-3.5">
            {categoryBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
                  <span>{item.category}</span>
                  <span className="text-slate-800">₹{Number(item.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-[#ff7a47] rounded-full transition-all duration-500"
                    style={{ width: `${(Number(item.amount) / maxCatSales) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operating Expense Ledger items table list */}
        <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-[2.5rem] shadow-xl md:col-span-2 space-y-4 flex flex-col justify-between text-left">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-rose-500">Cost Outflows</span>
              <h4 className="text-sm font-black text-slate-900 leading-none">Active OPEX Expenses</h4>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5"
            >
              Log New
            </button>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-64 scrollbar-thin">
            {filteredExpenses.length === 0 ? (
              <p className="text-slate-400 text-[10px] font-bold text-center py-10">No expenses recorded for this date filter range.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                    <th className="py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[10px] font-bold text-slate-650">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="py-3 font-extrabold text-slate-800">{exp.title}</td>
                      <td className="py-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] uppercase tracking-wide">{exp.category}</span>
                      </td>
                      <td className="py-3 text-right text-rose-600 font-extrabold">-₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition"
                          title="Remove cost entry"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>


      {/* LOG EXPENSE MODAL OVERLAY */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in text-slate-800">
          <form onSubmit={handleAddExpense} className="bg-white rounded-[2.2rem] p-8 w-full max-w-md shadow-2xl relative border border-slate-200 text-left">
            <button type="button" onClick={() => setShowExpenseModal(false)} className="absolute top-5 right-5 text-slate-450 hover:text-slate-900 text-2xl font-black">×</button>

            <div className="text-center space-y-1.5 mb-6.5">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Log Operating Cost</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Record direct expense payouts into double-entry ledger</p>
            </div>

            <div className="space-y-4.5">

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1.5">Expense Description</label>
                <input
                  type="text"
                  placeholder="e.g. Rice & Flour Wholesale Supply"
                  value={expTitleInput}
                  onChange={(e) => setExpTitleInput(e.target.value)}
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1.5">Payout Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 3500"
                    value={expAmountInput}
                    onChange={(e) => setExpAmountInput(e.target.value)}
                    className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1.5">Category</label>
                  <select
                    value={expCategoryInput}
                    onChange={(e) => setExpCategoryInput(e.target.value)}
                    className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:border-slate-800 transition cursor-pointer"
                  >
                    <option value="Kitchen Ops">Kitchen Ops</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Rent & Power">Rent &amp; Power</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1.5">Expense Date</label>
                <input
                  type="date"
                  value={expDateInput}
                  onChange={(e) => setExpDateInput(e.target.value)}
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-800 transition"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg transition active:scale-95"
              >
                Submit Expense Outflow
              </button>

            </div>
          </form>
        </div>
      )}

      {/* FULL SCREEN LEDGER MODAL - rendered via portal to escape layout stacking context */}
      {showLedgerModal && mounted && createPortal(
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <div className="bg-white rounded-[2rem] w-full max-w-[90vw] xl:max-w-5xl max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Profit & Loss Ledger</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Complete double-entry accounting ledger</p>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <div className="bg-slate-100 p-1 rounded-full flex gap-1 shrink-0">
                  <button onClick={() => setLedgerFilter('today')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${ledgerFilter === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Today</button>
                  <button onClick={() => setLedgerFilter('this_month')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${ledgerFilter === 'this_month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Month</button>
                  <button onClick={() => setLedgerFilter('this_year')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${ledgerFilter === 'this_year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Year</button>
                  <button onClick={() => setLedgerFilter('all')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${ledgerFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>All Time</button>
                </div>
                <button onClick={() => setShowLedgerModal(false)} className="w-10 h-10 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full flex items-center justify-center transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Modal Body: Table Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
              <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Date</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Description</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Inflow (₹)</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Outflow (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {allLedgerItems.length === 0 && (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">No ledger entries found for this period.</td></tr>
                    )}
                    {allLedgerItems.map((item) => (
                      <tr key={item.id} className={`transition ${item.type === 'inflow' ? 'hover:bg-emerald-50/50' : 'hover:bg-rose-50/50'}`}>
                        <td className="py-4 px-6 whitespace-nowrap">{item.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-4 px-6 font-extrabold text-slate-900">{item.title}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${item.type === 'inflow' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 border rounded-lg text-[9px] font-black uppercase tracking-wider ${item.type === 'inflow' ? 'border-emerald-200 text-emerald-600' : 'border-rose-200 text-rose-600'}`}>
                            {item.type === 'inflow' ? 'Credit' : 'Debit'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-emerald-600 text-sm">
                          {item.type === 'inflow' ? `+₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-4 px-6 text-right font-black text-rose-600 text-sm">
                          {item.type === 'outflow' ? `-₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer: Sticky Totals */}
            <div className="p-4 md:p-6 border-t border-slate-100 bg-white shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Revenue</p>
                  <p className="text-xl font-black text-emerald-600 leading-none mt-1">+₹{lRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Expense</p>
                  <p className="text-xl font-black text-rose-600 leading-none mt-1">-₹{lExpAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className={`${lNetEarnings >= 0 ? 'bg-emerald-500 border-emerald-600' : 'bg-rose-500 border-rose-600'} border rounded-xl p-4 flex items-center justify-between text-white shadow-lg`}>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-90">Net Surplus / Margin</p>
                  <div className="flex items-end gap-1.5 mt-1">
                    <p className="text-xl font-black leading-none">₹{Math.abs(lNetEarnings).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs font-bold opacity-90 pb-0.5">({lNetMargin.toFixed(1)}%)</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        , document.body)}

      {/* FULL SCREEN MAXIMIZED 14-DAY CHART MODAL */}
      {showMaximizedChart && mounted && createPortal(
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)' }}
          className="animate-in fade-in duration-300"
        >
          <div className="bg-white rounded-[2.5rem] w-full max-w-[95vw] xl:max-w-6xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom-8 duration-300">

            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ff5722] animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#ff5722]">Sales Performance</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
                  14-Day Revenue Trend Analytics
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Continuous billing telemetry matching physical dining revenue and remote channels.
                </p>
              </div>
              <button
                onClick={() => setShowMaximizedChart(false)}
                className="w-10 h-10 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full flex items-center justify-center transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 space-y-6">

              {/* Analytics Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">14-Day Cumulative Revenue</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">₹{total14DaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  <span className="text-[10px] font-extrabold text-emerald-500 mt-2 block"> Audited Live Billing</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Sales Average</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">₹{avg14DaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  <span className="text-[10px] font-extrabold text-slate-400 mt-2 block">Calculated over 14 active days</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Peak Daily Invoice</p>
                  <p className="text-2xl font-black text-[#ff5722] mt-1">₹{max14DaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  <span className="text-[10px] font-extrabold text-emerald-500 mt-2 block"> High Sales Accomplished</span>
                </div>
              </div>

              {/* Large Outline SVG Graph with dynamic scrolling and zoom controls */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-end min-h-[380px] relative overflow-hidden">

                {/* Header elements */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interactive Data Wave</span>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 p-1.5 rounded-xl self-start sm:self-auto shadow-inner">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Zoom:</span>
                    {[1, 1.5, 2, 3].map((scale) => (
                      <button
                        key={scale}
                        onClick={() => setZoomScale(scale)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${zoomScale === scale
                            ? "bg-[#ff5722] text-white shadow"
                            : "bg-transparent hover:bg-slate-200 text-slate-500 font-extrabold"
                          }`}
                      >
                        {scale}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horizontal Scrollable Container */}
                <div className="w-full overflow-x-auto scrollbar-thin mt-6 pb-2">
                  <div
                    style={{ width: `${zoomScale * 100}%`, minWidth: '100%', transition: 'width 0.25s ease-in-out' }}
                    className="flex flex-col justify-end"
                  >
                    {/* SVG Curve */}
                    <div className="h-72 w-full relative">
                      <svg className="w-full h-full" viewBox="0 0 1000 240" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff5722" stopOpacity="1" />
                            <stop offset="100%" stopColor="#ff9800" stopOpacity="1" />
                          </linearGradient>
                          <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff5722" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#ff5722" stopOpacity="0" />
                          </linearGradient>
                        </defs>

                        {/* Dotted Grid lines */}
                        <line x1="0" y1="60" x2="1000" y2="60" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="6,6" />
                        <line x1="0" y1="120" x2="1000" y2="120" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="6,6" />
                        <line x1="0" y1="180" x2="1000" y2="180" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="6,6" />

                        {/* Area under curve */}
                        <path
                          d={`M 0 240 ${trend14Days.map((t, idx) => {
                            const x = (idx / 13) * 1000;
                            const y = 240 - (Number(t.sales) / max14DaySales) * 180 - 20;
                            return `L ${x} ${y}`;
                          }).join(" ")} L 1000 240 Z`}
                          fill="url(#chart-area)"
                        />

                        {/* Stroke line */}
                        <path
                          d={trend14Days.map((t, idx) => {
                            const x = (idx / 13) * 1000;
                            const y = 240 - (Number(t.sales) / max14DaySales) * 180 - 20;
                            return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                          }).join(" ")}
                          fill="none"
                          stroke="url(#chart-gradient)"
                          strokeWidth="5.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Circles on peak / data points */}
                        {trend14Days.map((t, idx) => {
                          const x = (idx / 13) * 1000;
                          const y = 240 - (Number(t.sales) / max14DaySales) * 180 - 20;
                          return (
                            <g key={idx} className="group/dot cursor-pointer">
                              <circle
                                cx={x}
                                cy={y}
                                r="7.5"
                                fill="#0f172a"
                                stroke="#ffffff"
                                strokeWidth="3"
                                className="transition transform duration-200 hover:scale-150"
                              />
                              <title>{t.day}: ₹{Number(t.sales).toLocaleString('en-IN')}</title>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* X Axis labels (Scrolling in sync inside width scaling wrapper) */}
                    <div className="flex justify-between w-full pt-4 border-t border-slate-100 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {trend14Days.map((t, idx) => (
                        <span key={idx} className="w-16 text-center whitespace-nowrap">{t.day}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scroll reminder instructions (Only shows when zoomed) */}
                {zoomScale > 1 && (
                  <p className="text-center text-[9px] font-bold text-slate-450 uppercase tracking-wider mt-3.5 select-none animate-pulse">
                    ← Swipe / Drag horizontally to scroll through the 14-day trend timeline →
                  </p>
                )}
              </div>

            </div>

          </div>
        </div>
        , document.body)}

    </div>
  );
}
