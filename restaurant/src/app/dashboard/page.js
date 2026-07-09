"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";

export default function DashboardHome() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  
  // Menu and category counts to check for Onboarding state
  const [categories, setCategories] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Real-time Live Stats States
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const statsTimeoutRef = useRef(null);
  const menuTimeoutRef = useRef(null);

  const debouncedFetchStats = () => {
    if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    statsTimeoutRef.current = setTimeout(() => {
      fetchDashboardStats();
    }, 300);
  };

  const debouncedFetchMenu = () => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    menuTimeoutRef.current = setTimeout(() => {
      fetchMenuStatus();
    }, 300);
  };
  
  // Onboarding Wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    price: "",
    categoryId: "",
    stockQty: "100"
  });
  
  const [wizardError, setWizardError] = useState("");
  const [wizardSuccess, setWizardSuccess] = useState("");
  const [wizardLoading, setWizardLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRestaurant = localStorage.getItem("restaurant");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedRestaurant) setRestaurant(JSON.parse(storedRestaurant));
  }, []);

  const fetchDashboardStats = async () => {
    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboard/stats?_=${Date.now()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Menu categories & Stats on load with instant Socket.io live sync!
  useEffect(() => {
    if (user) {
      fetchMenuStatus();
      fetchDashboardStats();

      //  SOCKET.IO REAL-TIME CONNECTION
      const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
      const socket = io(BACKEND_URL, {
        transports: ["websocket"],
        reconnection: true
      });

      socket.on("connect", () => {
        console.log("Dashboard Overview Socket Connected:", socket.id);
        if (user.restaurantId) {
          socket.emit("join_restaurant", user.restaurantId);
        }
      });

      // Synchronize stats instantly on any backend transaction
      socket.on("new_order_placed", () => {
        debouncedFetchStats();
      });
      socket.on("new_qr_order_placed", () => {
        debouncedFetchStats();
      });
      socket.on("qr_order_approved", () => {
        debouncedFetchStats();
      });
      socket.on("order_updated", () => {
        debouncedFetchStats();
        debouncedFetchMenu();
      });
      socket.on("order_status_updated", () => {
        debouncedFetchStats();
      });
      socket.on("order_deleted", () => {
        debouncedFetchStats();
      });
      socket.on("order_payment_settled", () => {
        debouncedFetchStats();
      });
      socket.on("table_updated", () => {
        debouncedFetchStats();
      });
      socket.on("inventory_updated", () => {
        debouncedFetchStats();
      });
      socket.on("reports_updated", () => {
        debouncedFetchStats();
      });

      return () => {
        socket.disconnect();
        if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
        if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
      };
    }
  }, [user]);

  const fetchMenuStatus = async () => {
    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
    const token = localStorage.getItem("authToken");
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      // Auto-recover if database was seeded and old token restaurantId is mismatched (401)
      if (res.status === 401) {
        console.warn(" Session expired or DB seeded. Automatically redirecting to auth sync...");
        localStorage.clear();
        window.location.href = "/auth/login";
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        
        if (data.length > 0 && wizardStep === 1) {
          setWizardStep(2);
          setNewMenuItem(prev => ({ ...prev, categoryId: data[0].id.toString() }));
        }
      }
    } catch (error) {
      console.error("Error checking menu status:", error);
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setWizardError("");
    setWizardSuccess("");
    setWizardLoading(true);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create category.");
      }

      setWizardSuccess("Category created successfully!");
      setNewCategoryName("");
      await fetchMenuStatus();
      
      setTimeout(() => {
        setWizardStep(2);
        setWizardSuccess("");
      }, 1200);

    } catch (err) {
      setWizardError(err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    setWizardError("");
    setWizardSuccess("");
    setWizardLoading(true);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/menu-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newMenuItem.name,
          price: newMenuItem.price,
          categoryId: parseInt(newMenuItem.categoryId),
          stockQty: parseInt(newMenuItem.stockQty)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add menu item.");
      }

      setWizardSuccess("Fantastic! First dish added successfully!");
      setNewMenuItem({ name: "", price: "", categoryId: categories[0]?.id.toString() || "", stockQty: "100" });
      
      setTimeout(async () => {
        await fetchMenuStatus();
        setWizardSuccess("");
      }, 1500);

    } catch (err) {
      setWizardError(err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  if (!user || loadingMenu || loadingStats) {
    return <LoadingScreen message="Syncing dashboard engine..." minHeight="50vh" />;
  }

  const hasItems = categories.some(cat => 
    (cat._count && cat._count.menuItems > 0) || 
    (cat.menuItems && cat.menuItems.length > 0) || 
    cat.itemCount > 0
  );
  const showOnboardingWizard = user.role === "owner" && (!categories.length || !hasItems);

  // Dynamic Date string matching RestroServe format
  const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  const formattedDate = new Date().toLocaleDateString("en-US", dateOptions);

  return (
    <div className="space-y-8 animate-fade-in-up relative text-slate-800">
      

      {/* ========================================================
          STAGE B: FIRST-TIME WELCOME ONBOARDING WIZARD (LUXURY)
          ======================================================== */}
      {showOnboardingWizard ? (
        <div className="bg-white/90 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] space-y-10 border border-slate-100 shadow-xl shadow-slate-100/40 text-center relative overflow-hidden max-w-4xl mx-auto">
          
          {/* Subtle warm glow background accent */}
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#ff5722] bg-orange-50 border border-orange-100/50 px-4 py-2 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-pulse" />
               Fast-Track Indian Menu Setup
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight pt-1">
              Let's build your delicious Indian Menu!
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xl mx-auto font-semibold">
              To launch your high-speed POS billing terminal or activate KDS live feeds, we need to quickly create your first food Category and add a signature dish.
            </p>
          </div>

          {/* Dynamic Steps Indicator */}
          <div className="flex justify-center items-center gap-6 max-w-md mx-auto">
            <div className="flex items-center gap-2.5">
              <span className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${wizardStep >= 1 ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20' : 'bg-slate-100 text-slate-400'}`}>1</span>
              <span className={`text-xs font-black tracking-wide ${wizardStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Category Setup</span>
            </div>
            <div className={`w-16 h-[2px] transition-colors duration-500 ${wizardStep >= 2 ? 'bg-orange-500' : 'bg-slate-100'}`} />
            <div className="flex items-center gap-2.5">
              <span className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${wizardStep >= 2 ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20' : 'bg-slate-100 text-slate-400'}`}>2</span>
              <span className={`text-xs font-black tracking-wide ${wizardStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Dishes Setup</span>
            </div>
          </div>

          {wizardError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100/50 text-xs text-rose-600 font-bold max-w-lg mx-auto flex items-center justify-center gap-2 animate-bounce">
               {wizardError}
            </div>
          )}
          {wizardSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100/50 text-xs text-emerald-600 font-bold max-w-lg mx-auto flex items-center justify-center gap-2">
               {wizardSuccess}
            </div>
          )}

          {wizardStep === 1 && (
            <div className="max-w-md mx-auto bg-slate-50/50 border border-slate-100 p-6 md:p-8 rounded-[2rem] text-left shadow-sm">
              <form onSubmit={handleCreateCategory} className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Curries, Dum Biryani"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="premium-input text-slate-800 border-slate-200 text-xs bg-white font-bold"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={wizardLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-4 px-4 rounded-2xl text-xs tracking-wider transition-all duration-300 shadow-md shadow-slate-900/10 active:scale-[0.98]"
                >
                  {wizardLoading ? "Creating..." : "Save & Continue to Step 2"}
                </button>
              </form>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="max-w-md mx-auto bg-slate-50/50 border border-slate-100 p-6 md:p-8 rounded-[2rem] text-left shadow-sm">
              <form onSubmit={handleCreateMenuItem} className="space-y-5">
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Select Category</label>
                  <select
                    value={newMenuItem.categoryId}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, categoryId: e.target.value })}
                    className="premium-input text-slate-800 border-slate-200 text-xs bg-white font-bold"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Dish Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rich Paneer Butter Masala"
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                    className="premium-input text-slate-800 border-slate-200 text-xs bg-white font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Price (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 280"
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                      className="premium-input text-slate-800 border-slate-200 text-xs bg-white font-bold"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Initial Stock</label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={newMenuItem.stockQty}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, stockQty: e.target.value })}
                      className="premium-input text-slate-800 border-slate-200 text-xs bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="flex-1 py-3.5 border border-slate-200 hover:bg-slate-100 font-extrabold text-slate-600 rounded-2xl text-xs transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={wizardLoading}
                    className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition"
                  >
                    {wizardLoading ? "Adding..." : "Add Dish & Open Workspace"}
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>
      ) : (
        /* ========================================================
            STAGE C: FULL WORKSPACE WIDGETS (GORGEOUS GLASSMORPHISM)
           ======================================================== */
        <div className="space-y-8">
          
          {/* --- 1. FOUR GLOSSY MINI METRICS CARDS WITH WAVE CHARTS --- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            
            {/* Card 1: Today's Revenue */}
            <div className="bg-white/70 backdrop-blur-xl border border-slate-100/80 p-5.5 rounded-[2.2rem] space-y-4 shadow-xl shadow-slate-100/40 relative overflow-hidden flex flex-col justify-between min-h-[130px] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/5 hover:border-emerald-500/20 group">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight group-hover:scale-[1.02] transition-transform duration-300">
                    ₹{stats?.todayRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                  </h3>
                </div>
                <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:rotate-12 transition duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                </span>
              </div>
              {/* Green wave chart vector */}
              <div className="absolute bottom-0 inset-x-0 h-11 opacity-20 pointer-events-none group-hover:opacity-30 transition duration-500">
                <svg viewBox="0 0 100 20" className="w-full h-full text-emerald-500 fill-current">
                  <path d="M0,15 Q25,5 50,15 T100,5 L100,20 L0,20 Z" />
                </svg>
              </div>
            </div>
 
            {/* Card 2: Active Orders */}
            <div className="bg-white/70 backdrop-blur-xl border border-slate-100/80 p-5.5 rounded-[2.2rem] space-y-4 shadow-xl shadow-slate-100/40 relative overflow-hidden flex flex-col justify-between min-h-[130px] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-500/5 hover:border-rose-500/20 group">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Active Orders</span>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight group-hover:scale-[1.02] transition-transform duration-300">
                    {stats?.activeOrdersCount || "0"} KOTs
                  </h3>
                </div>
                <span className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition duration-300 animate-pulse">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>
                </span>
              </div>
              {/* Red wave chart vector */}
              <div className="absolute bottom-0 inset-x-0 h-11 opacity-20 pointer-events-none group-hover:opacity-30 transition duration-500">
                <svg viewBox="0 0 100 20" className="w-full h-full text-rose-500 fill-current">
                  <path d="M0,10 Q25,20 50,5 T100,15 L100,20 L0,20 Z" />
                </svg>
              </div>
            </div>
 
            {/* Card 3: Busy Tables */}
            <div className="bg-white/70 backdrop-blur-xl border border-slate-100/80 p-5.5 rounded-[2.2rem] space-y-4 shadow-xl shadow-slate-100/40 relative overflow-hidden flex flex-col justify-between min-h-[130px] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-500/20 group">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Busy Tables</span>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight group-hover:scale-[1.02] transition-transform duration-300">
                    {stats?.busyTables?.busy || "0"} / {stats?.busyTables?.total || "0"} Busy
                  </h3>
                </div>
                <span className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:rotate-12 transition duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                </span>
              </div>
              {/* Blue wave chart vector */}
              <div className="absolute bottom-0 inset-x-0 h-11 opacity-20 pointer-events-none group-hover:opacity-30 transition duration-500">
                <svg viewBox="0 0 100 20" className="w-full h-full text-blue-500 fill-current">
                  <path d="M0,15 Q30,5 60,15 T100,10 L100,20 L0,20 Z" />
                </svg>
              </div>
            </div>
 
            {/* Card 4: Completed Today's */}
            <div className="bg-white/70 backdrop-blur-xl border border-slate-100/80 p-5.5 rounded-[2.2rem] space-y-4 shadow-xl shadow-slate-100/40 relative overflow-hidden flex flex-col justify-between min-h-[130px] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/5 hover:border-purple-500/20 group">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Completed Today's</span>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight group-hover:scale-[1.02] transition-transform duration-300">
                    {stats?.completedTodayCount || "0"} Orders
                  </h3>
                </div>
                <span className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
              </div>
              {/* Purple wave chart vector */}
              <div className="absolute bottom-0 inset-x-0 h-11 opacity-20 pointer-events-none group-hover:opacity-30 transition duration-500">
                <svg viewBox="0 0 100 20" className="w-full h-full text-purple-500 fill-current">
                  <path d="M0,5 Q20,15 50,5 T100,15 L100,20 L0,20 Z" />
                </svg>
              </div>
            </div>
 
          </div>
 
          {/* --- 2. THREE LARGE GRADIENT FULFILLMENT CARDS WITH REFLECTIONS --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            
            {/* Card A: Dine-In (Orange Glossy Gradient) */}
            <div className="bg-gradient-to-br from-orange-500 via-[#ff5722] to-amber-600 text-white rounded-[2.5rem] p-7 space-y-6 shadow-xl shadow-orange-500/10 hover:shadow-orange-500/30 hover:-translate-y-1.5 transition-all duration-500 relative overflow-hidden group">
              {/* Glossy diagonal highlight glare */}
              <div className="absolute -inset-y-2 left-[-100%] w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000 ease-out pointer-events-none" />
              
              <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" /></svg>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/70 block">SHARE</span>
                  <span className="text-lg font-black tracking-tight">{stats?.fulfillments?.dineIn?.share || "0"}%</span>
                </div>
              </div>
              
              <div className="space-y-1 relative z-10">
                <h3 className="text-2xl font-black tracking-tight">Dine-In</h3>
              </div>
 
              <div className="grid grid-cols-3 border-t border-white/20 pt-4 text-left relative z-10 gap-2">
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">REVENUE</span>
                  <span className="text-sm font-black">₹{stats?.fulfillments?.dineIn?.revenue?.toLocaleString() || "0"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">ORDERS</span>
                  <span className="text-sm font-black">{stats?.fulfillments?.dineIn?.orders || "0"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">AVG BILL</span>
                  <span className="text-sm font-black">₹{stats?.fulfillments?.dineIn?.avgBill?.toLocaleString() || "0"}</span>
                </div>
              </div>
 
              <div className="text-[9px] font-bold text-white/80 flex flex-wrap gap-2 md:gap-3 pt-2.5 border-t border-white/10 relative z-10">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> 
                  {stats?.fulfillments?.dineIn?.activeCount || "0"} active
                </span>
                <span> {stats?.fulfillments?.dineIn?.completedCount || "0"} done</span>
                <span> {stats?.fulfillments?.dineIn?.itemsCount || "0"} items</span>
              </div>
            </div>
 
            {/* Card B: Delivery (Blue Glossy Gradient) */}
            <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-750 text-white rounded-[2.5rem] p-7 space-y-6 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/30 hover:-translate-y-1.5 transition-all duration-500 relative overflow-hidden group">
              {/* Glossy diagonal highlight glare */}
              <div className="absolute -inset-y-2 left-[-100%] w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000 ease-out pointer-events-none" />
 
              <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/70 block">SHARE</span>
                  <span className="text-lg font-black tracking-tight">{stats?.fulfillments?.delivery?.share || "0"}%</span>
                </div>
              </div>
              
              <div className="space-y-1 relative z-10">
                <h3 className="text-2xl font-black tracking-tight">Delivery</h3>
              </div>
 
              <div className="grid grid-cols-3 border-t border-white/20 pt-4 text-left relative z-10 gap-2">
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">REVENUE</span>
                  <span className="text-sm font-black">₹{stats?.fulfillments?.delivery?.revenue?.toLocaleString() || "0"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">ORDERS</span>
                  <span className="text-sm font-black">{stats?.fulfillments?.delivery?.orders || "0"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">AVG BILL</span>
                  <span className="text-sm font-black">₹{stats?.fulfillments?.delivery?.avgBill?.toLocaleString() || "0"}</span>
                </div>
              </div>
 
              <div className="text-[9px] font-bold text-white/80 flex flex-wrap gap-2 md:gap-3 pt-2.5 border-t border-white/10 relative z-10">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> 
                  {stats?.fulfillments?.delivery?.activeCount || "0"} active
                </span>
                <span> {stats?.fulfillments?.delivery?.completedCount || "0"} done</span>
                <span> {stats?.fulfillments?.delivery?.itemsCount || "0"} items</span>
              </div>
            </div>
 
            {/* Card C: Takeaway / Parcel (Green Glossy Gradient) */}
            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-[2.5rem] p-7 space-y-6 shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/30 hover:-translate-y-1.5 transition-all duration-500 relative overflow-hidden group">
              {/* Glossy diagonal highlight glare */}
              <div className="absolute -inset-y-2 left-[-100%] w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000 ease-out pointer-events-none" />
 
              <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/70 block">SHARE</span>
                  <span className="text-lg font-black tracking-tight">{stats?.fulfillments?.takeaway?.share || "0"}%</span>
                </div>
              </div>
              
              <div className="space-y-1 relative z-10">
                <h3 className="text-2xl font-black tracking-tight">Parcel</h3>
              </div>
 
              <div className="grid grid-cols-3 border-t border-white/20 pt-4 text-left relative z-10 gap-2">
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">REVENUE</span>
                  <span className="text-sm font-black">₹{stats?.fulfillments?.takeaway?.revenue?.toLocaleString() || "0"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">ORDERS</span>
                  <span className="text-sm font-black">{stats?.fulfillments?.takeaway?.orders || "0"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider block">AVG BILL</span>
                  <span className="text-sm font-black">₹{stats?.fulfillments?.takeaway?.avgBill?.toLocaleString() || "0"}</span>
                </div>
              </div>
 
              <div className="text-[9px] font-bold text-white/80 flex flex-wrap gap-2 md:gap-3 pt-2.5 border-t border-white/10 relative z-10">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> 
                  {stats?.fulfillments?.takeaway?.activeCount || "0"} active
                </span>
                <span> {stats?.fulfillments?.takeaway?.completedCount || "0"} done</span>
                <span> {stats?.fulfillments?.takeaway?.itemsCount || "0"} items</span>
              </div>
            </div>
 
          </div>
 
          {/* --- 3. FOUR FLOATING QUICK ACTIONS CAPSULES WITH GLOWS --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            
            {/* Action 1: POS Billing (Dark Slate) */}
            <Link href="/dashboard/pos" className="bg-[#0f172a]/95 hover:bg-[#090d16] text-white p-6 rounded-[2.2rem] border border-slate-800 hover:border-[#ff5722]/30 flex flex-col items-center justify-center text-center gap-3.5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#ff5722]/5 active:scale-95 group">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white smooth-transition group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21a3 3 0 11-6 0V6.5m12-3.5a3 3 0 11-6 0m-6 3.5H1.5M1.5 6.5a3 3 0 106 0V21a3 3 0 11-6 0V6.5z" />
                </svg>
              </div>
              <span className="text-xs font-black tracking-wide uppercase">POS Billing</span>
            </Link>
 
            {/* Action 2: Captain Desk / Staff (Orange) */}
            <Link href="/dashboard/staff" className="bg-[#ff5722] hover:bg-[#e64a19] text-white p-6 rounded-[2.2rem] flex flex-col items-center justify-center text-center gap-3.5 shadow-xl shadow-orange-500/10 hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-1 active:scale-95 group">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white smooth-transition group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
                </svg>
              </div>
              <span className="text-xs font-black tracking-wide uppercase">Captain Desk</span>
            </Link>
 
            {/* Action 3: Kitchen (Blue) */}
            <Link href="/dashboard/kds" className="bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white p-6 rounded-[2.2rem] flex flex-col items-center justify-center text-center gap-3.5 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1 active:scale-95 group">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white smooth-transition group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 00-4 4v2H6a3 3 0 00-3 3v2a3 3 0 003 3h12a3 3 0 003-3v-2a3 3 0 00-3-3h-2V6a4 4 0 00-4-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 17v2a3 3 0 003 3h6a3 3 0 003-3v-2" />
                </svg>
              </div>
              <span className="text-xs font-black tracking-wide uppercase">Kitchen Display</span>
            </Link>
 
            {/* Action 4: Inventory (White/Border) */}
            <Link href="/dashboard/inventory" className="bg-white hover:bg-[#fafbfd] text-slate-800 border border-slate-100 hover:border-slate-200 p-6 rounded-[2.2rem] flex flex-col items-center justify-center text-center gap-3.5 shadow-xl shadow-slate-200/20 hover:shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 group">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 smooth-transition group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-xs font-black tracking-wide uppercase">Inventory Control</span>
            </Link>
 
          </div>
 
          {/* --- 4. BOTTOM FEED AND TOP SELLING ITEMS --- */}
          <div className="grid lg:grid-cols-12 gap-8 pt-4">
            
            {/* Left: Kitchen Activity Feed */}
            <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[2.5rem] p-7 shadow-xl shadow-slate-200/30 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  <span>Live Kitchen Feed</span>
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-[#ff5722] bg-orange-50 border border-orange-100 px-3.5 py-1.5 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722]" />
                   ACTIVE KOTs
                </span>
              </div>
 
              <div className="space-y-4">
                {stats?.kitchenFeed?.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-extrabold text-xs">
                     All KOTs served! Kitchen queue is clean.
                  </div>
                ) : (
                  stats?.kitchenFeed?.map((kot) => (
                    <div key={kot.id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-3xl shadow-sm hover:border-orange-500/20 hover:bg-orange-50/[0.02] transition duration-300">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900">{kot.kotId} ({kot.tableNo})</p>
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${kot.status === 'pending' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">{kot.itemsText}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${kot.status === 'pending' ? 'bg-rose-50 border border-rose-100 text-rose-600' : 'bg-amber-50 border border-amber-100 text-amber-605'}`}>
                        {kot.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
 
            {/* Right: Top Selling Specialties */}
            <div className="lg:col-span-4 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[2.5rem] p-7 shadow-xl shadow-slate-200/30 space-y-5">
              <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18m-9-9l9 9-9 9" />
                  </svg>
                  <span>Popular Items</span>
                </h3>
              </div>
 
              <div className="space-y-5">
                {stats?.popularItems?.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-extrabold text-xs">
                     No sales completed yet today.
                  </div>
                ) : (
                  stats?.popularItems?.map((item) => (
                    <div key={item.rank} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-800 font-black">{item.rank}. {item.name}</span>
                        <span className="text-[10px] font-black text-[#ff5722] bg-orange-50 px-2 py-0.5 rounded-md">{item.soldCount} Sold</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" style={{ width: `${Math.min(100, (item.soldCount / Math.max(1, stats.popularItems[0].soldCount)) * 100)}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
 
          </div>
 
        </div>
      )}

    </div>
  );
}
