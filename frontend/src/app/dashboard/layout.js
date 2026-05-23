"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";
import Chatbot from "@/components/Chatbot";

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Real-time badge telemetry, category collapse, sidebar customizations and settings toggle states
  const [pendingQrCount, setPendingQrCount] = useState(0);
  const [activeKdsCount, setActiveKdsCount] = useState(0);
  const [qrOrderingEnabled, setQrOrderingEnabled] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [updatingStoreStatus, setUpdatingStoreStatus] = useState(false);
  const [vexoAiEnabled, setVexoAiEnabled] = useState(true);
  const [subscriptionPlan, setSubscriptionPlan] = useState('trial');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [enabledFeatures, setEnabledFeatures] = useState({});

  // Custom Sidebar Configuration States
  const [sidebarTheme, setSidebarTheme] = useState('light');
  const [sidebarQuickActions, setSidebarQuickActions] = useState(true);
  const [sidebarStoreSwitch, setSidebarStoreSwitch] = useState(true);
  const [sidebarCollapsible, setSidebarCollapsible] = useState(true);
  const [sidebarHiddenItems, setSidebarHiddenItems] = useState([]);

  const pathname = usePathname();
  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
  const fetchTimeoutRef = useRef(null);

  // Load layout collapse preferences from storage
  useEffect(() => {
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored === "true") {
      setIsCollapsed(true);
    }
    try {
      const storedCollapsed = localStorage.getItem("sidebarCollapsedGroups");
      if (storedCollapsed) {
        setCollapsedGroups(JSON.parse(storedCollapsed));
      }
    } catch (e) { }
  }, []);

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  const toggleGroupCollapse = (groupTitle) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [groupTitle]: !prev[groupTitle] };
      localStorage.setItem("sidebarCollapsedGroups", JSON.stringify(next));
      return next;
    });
  };

  // Telemetry: Sync active order counts and store operational preferences
  const fetchCountsAndSettings = async () => {
    // Performance optimization: Avoid server load if the tab is running in the background
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      // Fetch combined metrics in a single fast parallel request
      const res = await fetch(`${BACKEND_URL}/api/dashboard/sidebar-telemetry?_=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setPendingQrCount(data.pendingQrCount || 0);
        setActiveKdsCount(data.activeKdsCount || 0);
        setQrOrderingEnabled(data.qrOrderingEnabled !== false);
        setSidebarTheme(data.sidebarTheme || 'light');
        setSidebarQuickActions(data.sidebarQuickActions !== false);
        setSidebarStoreSwitch(data.sidebarStoreSwitch !== false);
        setSidebarCollapsible(data.sidebarCollapsible !== false);
        setSidebarHiddenItems(data.sidebarHiddenItems || []);
        setVexoAiEnabled(data.vexoAiEnabled !== false);
        setSubscriptionPlan(data.subscriptionPlan || 'trial');
        setSubscriptionStatus(data.subscriptionStatus || 'active');
        setTrialEndsAt(data.trialEndsAt || null);
        setEnabledFeatures(data.enabledFeatures || {});
      }
    } catch (err) {
      console.error("Failed to sync sidebar telemetry:", err);
    }
  };

  // Trigger update when tab returns to focus/visible state
  useEffect(() => {
    if (typeof window === "undefined" || !window.addEventListener) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchCountsAndSettings();
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Debounce API calls by 300ms to group rapid socket updates
  const triggerTelemetrySync = () => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchCountsAndSettings();
    }, 300);
  };

  // Optimistic Toggle for Store ordering status
  const handleToggleStoreStatus = async () => {
    if (updatingStoreStatus) return;
    setUpdatingStoreStatus(true);

    const token = localStorage.getItem("authToken");
    const nextVal = !qrOrderingEnabled;

    setQrOrderingEnabled(nextVal);

    try {
      const getRes = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      let customerTheme = "sunset";
      if (getRes.ok) {
        const currentData = await getRes.json();
        customerTheme = currentData.customerTheme || "sunset";
      }

      const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          qrOrderingEnabled: nextVal,
          customerTheme
        })
      });

      if (!res.ok) {
        setQrOrderingEnabled(!nextVal); // Rollback
      }
    } catch (err) {
      console.error("Store status toggle failed:", err);
      setQrOrderingEnabled(!nextVal); // Rollback
    } finally {
      setUpdatingStoreStatus(false);
    }
  };

  // Live Socket telemetry updates
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    fetchCountsAndSettings();

    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          if (userObj.restaurantId) {
            socket.emit("join_restaurant", userObj.restaurantId);
          }
        } catch (e) { }
      }
    });

    // We can keep these for other syncs if needed, but remove telemetry fetch overhead
    socket.on("new_order_placed", () => { });
    socket.on("new_qr_order_placed", () => { });
    socket.on("order_status_updated", () => { });
    socket.on("order_deleted", () => { });
    socket.on("table_updated", () => triggerTelemetrySync());

    // Direct Realtime Telemetry Push (Zero Polling)
    socket.on("sidebar_telemetry_updated", (data) => {
      if (data) {
        setPendingQrCount(data.pendingQrCount || 0);
        setActiveKdsCount(data.activeKdsCount || 0);
        setQrOrderingEnabled(data.qrOrderingEnabled !== false);
        setSidebarTheme(data.sidebarTheme || 'light');
        setSidebarQuickActions(data.sidebarQuickActions !== false);
        setSidebarStoreSwitch(data.sidebarStoreSwitch !== false);
        setSidebarCollapsible(data.sidebarCollapsible !== false);
        setSidebarHiddenItems(data.sidebarHiddenItems || []);
        setSubscriptionPlan(data.subscriptionPlan || 'trial');
        setSubscriptionStatus(data.subscriptionStatus || 'active');
        setTrialEndsAt(data.trialEndsAt || null);
      }
    });

    return () => {
      socket.disconnect();
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  // Event listener to reload telemetry when upgraded in settings
  useEffect(() => {
    const handleSubUpdated = () => {
      fetchCountsAndSettings();
    };
    window.addEventListener("subscription_updated", handleSubUpdated);
    return () => {
      window.removeEventListener("subscription_updated", handleSubUpdated);
    };
  }, []);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    const storedRestaurant = localStorage.getItem("restaurant");

    if (!token || !storedUser) {
      window.location.href = "/auth/login";
      return;
    }

    setUser(JSON.parse(storedUser));
    setRestaurant(JSON.parse(storedRestaurant));

    // Silent Session Health check to recover from database seeding drift
    fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")}/api/menu/categories`, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then(res => {
      if (res.status === 401) {
        console.warn(" Global Layout detected expired or seeded session. Auto-redirecting to auth sync...");
        localStorage.clear();
        window.location.href = "/auth/login";
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error("Global session check failed:", err);
      setLoading(false);
    });
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/auth/login";
  };

  if (loading) {
    return <LoadingScreen message="Securing session..." minHeight="100vh" fullScreen={true} />;
  }

  // Helper to render high-end minimal SVG Outline Icons matching RestroServe style
  // Helper to render high-end minimal SVG Outline Icons matching RestroServe style
  const renderIcon = (name) => {
    switch (name) {
      case "Dashboard":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        );
      case "Analytics & Reports":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 17l4-4 4 4 6-6" />
          </svg>
        );
      case "Expenses":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "POS Billing":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21a3 3 0 11-6 0V6.5m12-3.5a3 3 0 11-6 0m-6 3.5H1.5M1.5 6.5a3 3 0 106 0V21a3 3 0 11-6 0V6.5z" />
          </svg>
        );
      case "Orders Manager":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "Kitchen":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 00-4 4v2H6a3 3 0 00-3 3v2a3 3 0 003 3h12a3 3 0 003-3v-2a3 3 0 00-3-3h-2V6a4 4 0 00-4-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 17v2a3 3 0 003 3h6a3 3 0 003-3v-2" />
          </svg>
        );
      case "Inventory":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case "StockControl":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case "Staff":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
          </svg>
        );
      case "Waiter Panel":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="7" y="2" width="10" height="20" rx="2.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 18h2" />
          </svg>
        );
      case "Table Manager":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="3" width="6" height="6" rx="1" />
            <rect x="15" y="3" width="6" height="6" rx="1" />
            <rect x="3" y="15" width="6" height="6" rx="1" />
            <rect x="15" y="15" width="6" height="6" rx="1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" />
          </svg>
        );
      case "QR Code Order Management":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case "Security":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case "Menu":
        return (
          <svg className="w-5 h-5 smooth-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Grouped Navigation to match RestroServe style
  const navigationGroups = [
    {
      title: "OVERVIEW",
      activeGradient: "from-[#ff5722] to-[#ff7a47]",
      items: [
        { name: "Dashboard Overview", path: "/dashboard", icon: "Dashboard", allowed: true }
      ]
    },
    {
      title: "LIVE TERMINALS",
      activeGradient: "from-[#ff5722] to-[#ff7a47]",
      items: [
        { name: "POS Billing", path: "/dashboard/pos", icon: "POS Billing", allowed: user?.role === "owner" || user?.role === "waiter", badge: "FAST" },
        { name: "Orders Manager", path: "/dashboard/orders", icon: "Orders Manager", allowed: user?.role === "owner" || user?.role === "waiter" },
        { name: "QR Code Approvals", path: "/dashboard/qr", icon: "QR Code Order Management", allowed: user?.role === "owner" || user?.role === "waiter", badge: enabledFeatures.qrOrdering === false ? "LOCKED" : null },
        { name: "Kitchen Display (KDS)", path: "/dashboard/kds", icon: "Kitchen", allowed: user?.role === "owner" || user?.role === "kitchen" }
      ]
    },
    {
      title: "REPORTS",
      activeGradient: "from-[#ff5722] to-[#ff7a47]",
      items: [
        { name: "Analytics & Reports", path: "/dashboard/reports", icon: "Analytics & Reports", allowed: user?.role === "owner", badge: enabledFeatures.analytics === false ? "LOCKED" : null }
      ]
    },
    {
      title: "MANAGEMENT",
      activeGradient: "from-[#ff5722] to-[#ff7a47]",
      items: [
        { name: "Menu Catalog", path: "/dashboard/menu", icon: "Menu", allowed: user?.role === "owner" },
        { name: "Menu Stock Control", path: "/dashboard/menu/stock", icon: "StockControl", allowed: user?.role === "owner" },
        { name: "Table Settings", path: "/dashboard/tables", icon: "Table Manager", allowed: user?.role === "owner" },
        { name: "Inventory Stock", path: "/dashboard/inventory", icon: "Inventory", allowed: user?.role === "owner", badge: enabledFeatures.inventory === false ? "LOCKED" : null },
        { name: "Expenses Tracker", path: "/dashboard/expenses", icon: "Expenses", allowed: user?.role === "owner", badge: enabledFeatures.analytics === false ? "LOCKED" : null }
      ]
    },
    {
      title: "SYSTEM SETTINGS",
      activeGradient: "from-[#ff5722] to-[#ff7a47]",
      items: [
        { name: "Staff & Security", path: "/dashboard/staff", icon: "Staff", allowed: user?.role === "owner", badge: enabledFeatures.staffManagement === false ? "LOCKED" : null },
        { name: "Settings Console", path: "/dashboard/settings", icon: "Security", allowed: user?.role === "owner" }
      ]
    }
  ];

  const getPageHeaderDetails = () => {
    switch (pathname) {
      case "/dashboard":
        return {
          group: "Business Intelligence",
          title: "Dashboard Overview",
          subtitle: "Real-time analytics, revenue, and active visitor counts"
        };
      case "/dashboard/reports":
        return {
          group: "Reports",
          title: "Analytics & Reports Console",
          subtitle: "Audit complete profit & loss ledgers, dining sales telemetry, and strong mathematical accounts"
        };
      case "/dashboard/expenses":
        return {
          group: "Management",
          title: "Expenses Tracker",
          subtitle: "Manage and record day-to-day operations and operational expenditures."
        };
      case "/dashboard/pos":
        return {
          group: "Live Terminals",
          title: "Point of Sale Billing",
          subtitle: "Create walk-in order bills, process instant cash receipts, and direct KOTs"
        };
      case "/dashboard/orders":
        return {
          group: "Live Terminals",
          title: "Orders & Invoice Manager",
          subtitle: "Audit dine-in orders, settle unpaid visitor tabs, approve incoming QR self-orders, and print receipts"
        };
      case "/dashboard/qr":
        return {
          group: "Live Terminals",
          title: "QR Code Approvals Hub",
          subtitle: "Audit customer live self-orders, monitor table browser telemetry, and regulate spam firewalls"
        };
      case "/dashboard/tables":
        return {
          group: "Management",
          title: "Table Settings",
          subtitle: "Configure floor seeding cards, clear live table sessions, and print standalone QR codes"
        };
      case "/dashboard/menu":
        return {
          group: "Management",
          title: "Menu Catalog",
          subtitle: "Manage kitchen recipes, food pricing categories, and dietary tags"
        };
      case "/dashboard/menu/stock":
        return {
          group: "Management",
          title: "Menu Stock Control",
          subtitle: "Enable per-item stock tracking, adjust quantities, and manage cost prices and profit margins"
        };
      case "/dashboard/kds":
        return {
          group: "Live Terminals",
          title: "Kitchen Display System",
          subtitle: "Monitor active kitchen order tickets, update chef preparation status, and ring bells"
        };
      case "/dashboard/inventory":
        return {
          group: "Management",
          title: "Recipe & Raw Inventory",
          subtitle: "Manage raw kitchen catalog and configure dynamic alerts on low levels"
        };
      case "/dashboard/staff":
        return {
          group: "System Settings",
          title: "Staff Management Terminal",
          subtitle: "Configure system authorization profiles, secure waiter PIN parameters, and coordinate access matrices"
        };
      case "/dashboard/settings":
        return {
          group: "System Settings",
          title: "Settings Console",
          subtitle: "Configure system parameters, taxes, security keys, and general configurations"
        };
      default:
        if (pathname.startsWith("/dashboard/settings/")) {
          return {
            group: "System Settings",
            title: "Settings Console",
            subtitle: "Configure system parameters, taxes, security keys, and general configurations"
          };
        }
        return {
          group: "Workspace",
          title: "RestroServe Live Panel",
          subtitle: "System control unit"
        };
    }
  };

  const getSidebarThemeClasses = () => {
    switch (sidebarTheme) {
      case 'dark':
        return {
          aside: "bg-slate-950 text-slate-100 border-r border-slate-900/60 shadow-lg",
          textHeader: "text-slate-100",
          textLogo: "text-amber-500",
          textSubLogo: "text-slate-500",
          workspaceBg: "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950",
          chefBg: "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/20",
          dotBg: "bg-amber-500",
          border: "border-slate-900/40",
          activeLink: "bg-gradient-to-r from-amber-400 to-amber-500 border-transparent text-slate-950 shadow-md shadow-amber-500/10 translate-x-1.5",
          inactiveLink: "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60 hover:translate-x-1",
          footerBg: "bg-slate-900/30 border-slate-900/40",
          titleColor: "text-slate-500 group-hover/hdr:text-slate-300",
          chevronColor: "text-slate-500 group-hover/hdr:text-slate-300"
        };
      case 'light':
      default:
        return {
          aside: "bg-white text-slate-800 border-r border-slate-100 shadow-sm",
          textHeader: "text-slate-900",
          textLogo: "text-slate-900",
          textSubLogo: "text-slate-400",
          workspaceBg: "bg-[#ff5722] text-white shadow-orange-500/20",
          chefBg: "bg-[#ff5722] text-white shadow-orange-500/20",
          dotBg: "bg-[#ff5722]",
          border: "border-slate-50",
          activeLink: "bg-gradient-to-r from-[#ff5722] to-[#ff7a47] border-transparent text-white shadow-md shadow-orange-500/15 translate-x-1.5",
          inactiveLink: "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/80 hover:translate-x-1",
          footerBg: "bg-slate-50/30 border-slate-50",
          titleColor: "text-slate-400 group-hover/hdr:text-slate-600",
          chevronColor: "text-slate-400 group-hover/hdr:text-slate-600"
        };
    }
  };

  const themeClasses = getSidebarThemeClasses();

  // Filter items in real-time according to settings visibility preferences
  const filteredNavigationGroups = navigationGroups.map(group => ({
    ...group,
    activeGradient: sidebarTheme === 'dark' ? "from-amber-400 to-amber-500" : "from-[#ff5722] to-[#ff7a47]",
    items: group.items.filter(item => item.allowed && !sidebarHiddenItems.includes(item.path))
  })).filter(group => group.items.length > 0);

  const headerDetails = getPageHeaderDetails();

  return (
    <div className="h-screen w-full bg-[#f8fafc] flex text-slate-800 overflow-hidden font-sans relative">

      {/* Sidebar Panel - Matches RestroServe styling perfectly */}
      <aside className={`fixed inset-y-0 left-0 z-30 ${isCollapsed ? 'w-[76px]' : 'w-[240px]'} h-full transition-all duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative md:flex-shrink-0 flex flex-col justify-between ${themeClasses.aside}`}>

        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={toggleSidebarCollapse}
          className={`hidden md:flex absolute top-20 -right-3.5 w-7 h-7 rounded-full bg-white border shadow-md text-slate-400 hover:scale-110 items-center justify-center transition-all duration-300 z-40 cursor-pointer ${sidebarTheme === 'midnight' ? 'border-slate-800 hover:text-amber-500' : 'border-slate-100 hover:text-[#ff5722]'
            }`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className={`w-3 h-3 transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Brand Header */}
        <div className={`px-5 py-5 flex flex-col gap-3 shrink-0 transition-all duration-300 ${themeClasses.border} ${isCollapsed ? 'items-center px-2' : ''}`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Logo badge with our minimalist interlocking loops logo */}
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-md border border-slate-100">
                <img src="/restuvexo_logo.png" alt="RESTUVEXO Logo" className="w-full h-full object-cover p-1.5" />
              </div>
              <div className={`transition-all duration-300 origin-left ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                <div className="flex items-center gap-1">
                  <span className={`font-black text-xl tracking-tight leading-none ${themeClasses.textHeader}`}>RESTUVEXO</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${themeClasses.dotBg}`} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 block ${themeClasses.textSubLogo}`}>ROS SYSTEM</span>
              </div>
            </div>
            {!isCollapsed && (
              <button
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition active:scale-95"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Owner Workspace Badge card & Control Switch Panel */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3 mt-1">
              <div className={`w-2 h-2 rounded-full animate-pulse ${themeClasses.dotBg}`} title="Owner Workspace Live" />

              {/* Collapsed Store Status Indicator */}
              {sidebarStoreSwitch && (
                <button
                  onClick={handleToggleStoreStatus}
                  disabled={updatingStoreStatus}
                  title={qrOrderingEnabled ? "Accepting Orders (Click to Pause)" : "Ordering Paused (Click to Accept)"}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all cursor-pointer ${qrOrderingEnabled
                      ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                      : "bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100"
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${qrOrderingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
                </button>
              )}

              {/* Collapsed Quick Action dropdown */}
              {sidebarQuickActions && (
                <div className="relative">
                  <button
                    onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                    title="Quick Actions"
                    className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition shadow-md cursor-pointer text-xs font-bold"
                  >

                  </button>
                  {isQuickActionOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsQuickActionOpen(false)} />
                      <div className="absolute left-10 -top-2 w-36 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                        <Link
                          href="/dashboard/pos"
                          onClick={() => setIsQuickActionOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-[#ff5722] transition"
                        >
                          <span> POS Billing</span>
                        </Link>
                        <Link
                          href="/dashboard/menu"
                          onClick={() => setIsQuickActionOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-[#ff5722] transition"
                        >
                          <span> Add Food</span>
                        </Link>
                        <Link
                          href="/dashboard/expenses"
                          onClick={() => setIsQuickActionOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-[#ff5722] transition"
                        >
                          <span> Record Exp</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 mt-1">
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all duration-300 ${themeClasses.workspaceBg}`}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  OWNER WORKSPACE
                </span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px] tracking-widest font-black text-white">LIVE</span>
              </div>

              {/* Expanded Store Status Switch */}
              {sidebarStoreSwitch && (
                <button
                  onClick={handleToggleStoreStatus}
                  disabled={updatingStoreStatus}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer ${qrOrderingEnabled
                      ? "bg-emerald-50/70 border-emerald-100 text-emerald-700 hover:bg-emerald-100/60"
                      : "bg-amber-50/70 border-amber-100 text-amber-700 hover:bg-amber-100/60"
                    }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${qrOrderingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'} shrink-0`} />
                    {qrOrderingEnabled ? "Accepting Orders" : "Ordering Paused"}
                  </span>
                  <span className="text-[8px] font-bold opacity-60">Toggle</span>
                </button>
              )}

              {/* Expanded Quick Action menu */}
              {sidebarQuickActions && (
                <div className="relative">
                  <button
                    onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span> Quick Action</span>
                    <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${isQuickActionOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {isQuickActionOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsQuickActionOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-xl p-1.5 z-50 space-y-0.5">
                        <Link
                          href="/dashboard/pos"
                          onClick={() => setIsQuickActionOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-[#ff5722] transition"
                        >
                          <span></span>
                          <span>POS Billing</span>
                        </Link>
                        <Link
                          href="/dashboard/menu"
                          onClick={() => setIsQuickActionOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-[#ff5722] transition"
                        >
                          <span></span>
                          <span>Add Menu Item</span>
                        </Link>
                        <Link
                          href="/dashboard/expenses"
                          onClick={() => setIsQuickActionOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-[#ff5722] transition"
                        >
                          <span></span>
                          <span>Record Expense</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation group scroll list - Pinned flex-1 scrollable */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-none">
          {filteredNavigationGroups.map((group, gIdx) => {
            const isGroupCollapsed = sidebarCollapsible ? (collapsedGroups[group.title] === true) : false;

            return (
              <div key={gIdx} className="space-y-1">
                {/* Category Title or divider line */}
                {isCollapsed ? (
                  <div className="border-t border-slate-100/80 my-3 mx-2" />
                ) : (
                  <button
                    onClick={() => sidebarCollapsible && toggleGroupCollapse(group.title)}
                    disabled={!sidebarCollapsible}
                    className={`w-full flex items-center justify-between px-3 py-1 text-left select-none group/hdr ${sidebarCollapsible ? 'cursor-pointer' : ''}`}
                  >
                    <h4 className={`text-[9px] font-black uppercase tracking-widest transition-colors ${sidebarTheme === 'midnight'
                        ? 'text-slate-500 group-hover/hdr:text-slate-300'
                        : 'text-slate-400 group-hover/hdr:text-slate-600'
                      }`}>
                      {group.title}
                    </h4>
                    {sidebarCollapsible && (
                      <svg
                        className={`w-2.5 h-2.5 transition-transform duration-300 ${sidebarTheme === 'midnight' ? 'text-slate-500' : 'text-slate-400'
                          } ${isGroupCollapsed ? "-rotate-90" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    )}
                  </button>
                )}

                <div className={`space-y-0.5 transition-all duration-300 overflow-hidden ${isGroupCollapsed && !isCollapsed ? 'max-h-0 opacity-0 hidden' : 'max-h-[500px] opacity-100'}`}>
                  {group.items.map((item, idx) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={idx}
                        href={item.path}
                        onClick={() => setSidebarOpen(false)}
                        title={isCollapsed ? item.name : ""}
                        className={`relative flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-black tracking-wide border transition-all duration-300 ${isCollapsed ? 'justify-center px-2 py-3' : ''
                          } ${isActive
                            ? themeClasses.activeLink
                            : themeClasses.inactiveLink
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center shrink-0">
                            {renderIcon(item.icon)}
                          </span>
                          <span className={`transition-all duration-300 origin-left ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                            {item.name}
                          </span>
                        </div>

                        {/* Telemetry dynamic badges */}
                        {item.name === "QR Code Approvals" && pendingQrCount > 0 && (
                          <span className={`bg-rose-500 text-white rounded-full text-[8.5px] font-black tracking-wide animate-pulse flex items-center justify-center ${isCollapsed
                              ? 'absolute top-1.5 right-1.5 w-4 h-4 shadow-sm shadow-rose-500/20'
                              : 'px-2 py-0.5'
                            }`}>
                            {pendingQrCount}
                          </span>
                        )}

                        {item.name === "Kitchen Display (KDS)" && activeKdsCount > 0 && (
                          <span className={`bg-amber-500 text-slate-950 rounded-full text-[8px] font-black tracking-wide flex items-center justify-center ${isCollapsed
                              ? 'absolute top-1.5 right-1.5 w-4 h-4'
                              : 'px-1.5 py-0.5'
                            }`}>
                            {activeKdsCount}
                          </span>
                        )}

                        {item.badge && !isCollapsed && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest scale-90 ${sidebarTheme === 'midnight' ? 'bg-amber-500/20 text-amber-300' : 'bg-orange-500 text-white'
                            }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer User Profile (Avatar badge "A" on accent background) - Pinned shrink-0 */}
        <div className={`p-3 shrink-0 transition-all duration-300 ${themeClasses.footerBg} ${isCollapsed ? 'px-2 py-4' : ''}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-black text-sm shadow-md ${themeClasses.dotBg}`} title={user?.name || "Aftab Sk"}>
                {user?.name?.charAt(0) || "A"}
              </div>
              <button
                onClick={handleLogout}
                className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition border border-transparent hover:border-rose-100"
                title="Logout session"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className={`flex items-center justify-between p-2.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 ${sidebarTheme === 'midnight' ? 'bg-[#131926] border border-slate-900' : 'bg-white border border-slate-100'
              }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-black text-sm shadow-md ${themeClasses.dotBg}`}>
                  {user?.name?.charAt(0) || "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-black truncate leading-tight ${sidebarTheme === 'midnight' ? 'text-slate-100' : 'text-slate-900'}`}>{user?.name || "Aftab Sk"}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">OWNER - ONLINE</span>
                  </div>
                </div>
              </div>

              {/* Logout action */}
              <button
                onClick={handleLogout}
                className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition border border-transparent hover:border-rose-100 cursor-pointer"
                title="Logout session"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden relative z-10">

        {/* Mobile Sidebar Backdrop Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Top Header Navigation with Dynamic Title & Subtitle */}
        <header className="w-full h-16 md:h-24 border-b border-slate-100 bg-white/95 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm shadow-slate-100/5 shrink-0 text-left">
          <div className="flex items-center gap-4 min-w-0">
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition border border-slate-200 shrink-0 active:scale-95"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#ff5722] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#ff5722]">{headerDetails.group}</span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">
                {headerDetails.title}
              </h2>
              <p className="text-slate-400 text-[10px] font-semibold truncate max-w-lg md:max-w-2xl mt-0.5">
                {headerDetails.subtitle}
              </p>
            </div>
          </div>

          {restaurant && vexoAiEnabled && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("vexoai_toggle"))}
                className="px-3 py-2 md:px-4.5 md:py-2.5 rounded-2xl bg-white hover:bg-orange-50/40 border-2 border-[#ff5722]/90 text-[#ff5722] hover:text-[#e04c1c] flex items-center gap-1.5 md:gap-2 shadow-sm font-black text-[9px] md:text-[11px] uppercase tracking-wider cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#ff5722] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.137m-8.904 0L21 9.813M9.813 15.904L3 9.096m0 0L14.187 3m-11.09 6.096L9 21" />
                </svg>
                Ask VexoAI
              </button>

              <div className="hidden md:block px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-center shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Restaurant</span>
                <span className="text-xs font-black text-slate-800 mt-1 block leading-none">{restaurant.name}</span>
              </div>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {(() => {
            const isExpired = subscriptionStatus === "expired" || (subscriptionPlan === "trial" && trialEndsAt && new Date(trialEndsAt).getTime() - Date.now() <= 0);
            const isBillingPage = pathname === "/dashboard/settings/billing";
            let isRouteLocked = false;
            let lockedFeatureName = "";

            if (pathname === "/dashboard/staff" && enabledFeatures.staffManagement === false) {
              isRouteLocked = true;
              lockedFeatureName = "Staff Management & Terminals";
            } else if (pathname === "/dashboard/qr" && enabledFeatures.qrOrdering === false) {
              isRouteLocked = true;
              lockedFeatureName = "Customer QR Self-Ordering";
            } else if (pathname === "/dashboard/inventory" && enabledFeatures.inventory === false) {
              isRouteLocked = true;
              lockedFeatureName = "Inventory Stock & Recipe Control";
            } else if ((pathname === "/dashboard/expenses" || pathname === "/dashboard/reports") && enabledFeatures.analytics === false) {
              isRouteLocked = true;
              lockedFeatureName = "Expenses & Analytics Reports";
            }

            if (isExpired && !isBillingPage) {
              return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white border border-slate-200/80 rounded-[2rem] shadow-xl max-w-2xl mx-auto my-12 space-y-6 animate-fade-in text-slate-800">
                  <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 animate-bounce shadow-md">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-700">Trial Expired</span>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">Your 7-Day Free Trial Has Expired</h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-md mx-auto">
                      Access to your POS billing terminal, live order queue, KDS feed, and analytics is currently suspended. Upgrade to a premium plan to restore access immediately.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/dashboard/settings/billing"
                      className="inline-flex py-3.5 px-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 text-xs items-center gap-2 transition duration-200 active:scale-95 cursor-pointer"
                    >
                      Choose a Subscription Plan
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            }

            if (isRouteLocked) {
              return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white border border-slate-200/80 rounded-[2rem] shadow-xl max-w-2xl mx-auto my-12 space-y-6 animate-fade-in text-slate-800">
                  <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 animate-pulse shadow-md">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700">Module Locked</span>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">{lockedFeatureName} is Locked</h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-md mx-auto">
                      This operational module is not enabled for your restaurant account. Please contact support/administration to activate it.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="mailto:support@restuvexo.shop?subject=Unlock Module Request"
                      className="inline-flex py-3.5 px-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 text-xs items-center gap-2 transition duration-200 active:scale-95 cursor-pointer"
                    >
                      Contact Administration
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </div>
                </div>
              );
            }

            return children;
          })()}
        </main>

      </div>
      {vexoAiEnabled && <Chatbot />}
    </div>
  );
}
