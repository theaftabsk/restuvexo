"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { CUSTOMER_THEMES } from "@/config/customerThemes";

export default function QrCustomerMenu() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tableId = params.tableId;
  const token = searchParams.get("token");

  // Restaurant & Menu States
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState("RESTUVEXO Café & Diner");
  const [tableNo, setTableNo] = useState("");
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Cart
  const [cart, setCart] = useState([]);
  
  // Ordering States
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [trackerExpanded, setTrackerExpanded] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Dynamic Theme (Sunset | Midnight | Emerald)
  const [customerTheme, setCustomerTheme] = useState("sunset");
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");

  // Customer Info Fields & QR Switch settings
  const [customerName, setCustomerName] = useState("");
  const [customerPhoneCode, setCustomerPhoneCode] = useState("91");
  const [customerPhoneBody, setCustomerPhoneBody] = useState("");
  const [qrOrderingEnabled, setQrOrderingEnabled] = useState(true);

  // Unique Mobile Guest Session Trackers
  const [sessionId, setSessionId] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3550);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
    const cachedName = localStorage.getItem("guestRestaurantName");
    if (cachedName) setRestaurantName(cachedName);
    const cachedTheme = localStorage.getItem("customerTheme");
    if (cachedTheme) setCustomerTheme(cachedTheme);

    const hour = new Date().getHours();
    let greet = "Welcome";
    if (hour < 12) greet = "Good Morning ";
    else if (hour < 17) greet = "Good Afternoon ";
    else greet = "Good Evening ";
    setGreeting(greet);

    let sid = token || localStorage.getItem("guestSessionId");
    let createdAt = localStorage.getItem("guestSessionCreatedAt");
    const now = Date.now();

    if (token && token !== localStorage.getItem("lastProcessedToken")) {
      sid = token;
      createdAt = now.toString();
      localStorage.setItem("guestSessionId", token);
      localStorage.setItem("guestSessionCreatedAt", createdAt);
      localStorage.setItem("lastProcessedToken", token);
      setSessionExpired(false);
    } else if (!sid || !createdAt) {
      sid = `guest_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guestSessionId", sid);
      localStorage.setItem("guestSessionCreatedAt", now.toString());
      setSessionExpired(false);
    } else if (now - parseInt(createdAt) > 10 * 60 * 1000) {
      setSessionExpired(true);
    } else {
      setSessionExpired(false);
    }
    setSessionId(sid);

    const savedName = localStorage.getItem("guestCustomerName") || "";
    setCustomerName(savedName);
    const savedPhone = localStorage.getItem("guestCustomerPhone") || "";
    if (savedPhone) {
      const matched = savedPhone.match(/^\+(\d{1,4})(.*)$/);
      if (matched) {
        setCustomerPhoneCode(matched[1]);
        setCustomerPhoneBody(matched[2]);
      } else {
        setCustomerPhoneBody(savedPhone);
      }
    }

    const ua = navigator.userAgent;
    let dev = "Unknown Mobile";
    if (/iphone/i.test(ua)) dev = "iPhone";
    else if (/ipad/i.test(ua)) dev = "iPad";
    else if (/android/i.test(ua)) {
      if (/samsung/i.test(ua)) dev = "Samsung Mobile";
      else if (/pixel/i.test(ua)) dev = "Google Pixel";
      else dev = "Android Mobile";
    } else if (/windows/i.test(ua)) dev = "Windows PC";
    else if (/mac/i.test(ua)) dev = "MacBook";
    
    setDeviceInfo(dev);
    localStorage.setItem("guestDeviceInfo", dev);
  }, []);

  useEffect(() => {
    if (tableId && sessionId) {
      fetchQrMenu();
    }
  }, [tableId, sessionId]);

  useEffect(() => {
    if (!restaurantId) return;

    // SOCKET.IO REAL-TIME CONNECTION
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("Customer Menu Socket Connected:", socket.id);
      socket.emit("join_restaurant", restaurantId);
    });

    // Handle instant real-time synchronization on KOT status changes, inventory adjustments, and table resets
    socket.on("new_order_placed", () => fetchQrMenuSilently());
    socket.on("order_updated", () => fetchQrMenuSilently());
    socket.on("order_status_updated", () => fetchQrMenuSilently());
    socket.on("order_deleted", () => fetchQrMenuSilently());
    socket.on("table_updated", () => fetchQrMenuSilently());
    socket.on("menu_updated", () => fetchQrMenuSilently());

    return () => {
      socket.disconnect();
    };
  }, [restaurantId]);

  const fetchQrMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/qr-menu/${tableId}?sessionId=${sessionId}&deviceInfo=${encodeURIComponent(deviceInfo)}`);
      if (!res.ok) throw new Error("Table QR is invalid or inactive.");
      const data = await res.json();
      
      if (data.restaurantId) {
        setRestaurantId(data.restaurantId);
      }
      if (data.restaurantName) {
        setRestaurantName(data.restaurantName);
        localStorage.setItem("guestRestaurantName", data.restaurantName);
      }
      setTableNo(data.tableNo);
      setCategories(data.categories);
      setMenuItems(data.menuItems);
      setQrOrderingEnabled(data.qrOrderingEnabled !== false);
      if (data.customerTheme) {
        setCustomerTheme(data.customerTheme);
        localStorage.setItem("customerTheme", data.customerTheme);
      }
      
      if (data.sessionExpired) {
        setSessionExpired(true);
      }

      if (data.activeOrders && data.activeOrders.length) {
        setActiveOrders(data.activeOrders);
      } else {
        setActiveOrders([]);
      }

    } catch (e) {
      triggerToast(` Error: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchQrMenuSilently = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/qr-menu/${tableId}?sessionId=${sessionId}&deviceInfo=${encodeURIComponent(deviceInfo)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.restaurantId) {
          setRestaurantId(data.restaurantId);
        }
        if (data.restaurantName) {
          setRestaurantName(data.restaurantName);
          localStorage.setItem("guestRestaurantName", data.restaurantName);
        }
        setTableNo(data.tableNo);
        setQrOrderingEnabled(data.qrOrderingEnabled !== false);
        if (data.customerTheme) {
          setCustomerTheme(data.customerTheme);
          localStorage.setItem("customerTheme", data.customerTheme);
        }
        if (data.sessionExpired) setSessionExpired(true);
        if (data.activeOrders && data.activeOrders.length) {
          setActiveOrders(data.activeOrders);
        } else {
          setActiveOrders([]);
        }
      }
    } catch (e) {
      console.error("Background active KOT sync failed:", e);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(i => i.menuItemId === item.id);
    const currentQty = existing ? existing.qty : 0;

    // Check stock if tracking is enabled at the item level
    if (item.trackStock) {
      if (currentQty + 1 > item.stockQty) {
        triggerToast(` Out of stock! Only ${item.stockQty} portions available.`, "error");
        return;
      }
    }

    if (existing) {
      setCart(cart.map(i => i.menuItemId === item.id ? { ...i, qty: i.qty + 1 } : i));
      triggerToast(`Added another "${item.name}" to cart`, "success");
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        qty: 1,
        note: ""
      }]);
      triggerToast(`"${item.name}" added to cart`, "success");
    }
  };

  const updateQty = (itemId, amount) => {
    const cartItem = cart.find(i => i.menuItemId === itemId);
    if (!cartItem) return;
    const newQty = cartItem.qty + amount;

    if (newQty > cartItem.qty) {
      const menuItem = menuItems.find(m => m.id === itemId);
      if (menuItem && menuItem.trackStock && newQty > menuItem.stockQty) {
        triggerToast(` Only ${menuItem.stockQty} portions available.`, "error");
        return;
      }
    }

    if (newQty <= 0) {
      setCart(cart.filter(i => i.menuItemId !== itemId));
    } else {
      setCart(cart.map(i => i.menuItemId === itemId ? { ...i, qty: newQty } : i));
    }
  };

  const updateItemNote = (itemId, note) => {
    setCart(cart.map(i => i.menuItemId === itemId ? { ...i, note } : i));
  };

  const handlePlaceSelfOrder = async () => {
    if (!cart.length) {
      triggerToast(" Add delicious dishes to your cart first!", "error");
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/qr-place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: isNaN(parseInt(tableId)) ? tableId : parseInt(tableId),
          sessionId: sessionId,
          deviceInfo: deviceInfo,
          customerName: customerName.trim() || "Guest",
          customerPhone: customerPhoneBody.trim() ? `+${customerPhoneCode}${customerPhoneBody.trim()}` : "N/A",
          items: cart.map(i => ({
            menuItemId: i.menuItemId,
            qty: i.qty,
            note: i.note
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");

      localStorage.setItem("guestCustomerName", customerName.trim());
      localStorage.setItem("guestCustomerPhone", customerPhoneBody.trim() ? `+${customerPhoneCode}${customerPhoneBody.trim()}` : "");
      localStorage.setItem("guestSessionCreatedAt", Date.now().toString());

      setActiveOrders(prev => {
        const exists = prev.some(o => o.id === data.order.id);
        if (exists) return prev;
        return [...prev, data.order];
      });
      
      setTrackerExpanded(true);
      setCart([]);
      triggerToast(" KOT submitted successfully! Cooking shortly...", "success");

    } catch (e) {
      triggerToast(` Failed: ${e.message}`, "error");
    } finally {
      setPlacingOrder(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category?.name === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const grandTotal = cartSubtotal;

  // Render Theme configurations mapping
  const getThemeClasses = () => {
    const activeTheme = CUSTOMER_THEMES.find(t => t.id === customerTheme) || CUSTOMER_THEMES[0];
    return activeTheme.classes;
  };

  const renderLoadingScreen = () => {
    const themeObj = CUSTOMER_THEMES.find(t => t.id === customerTheme) || CUSTOMER_THEMES[0];
    const cfg = themeObj.loader;
    return (
      <div className={cfg.bgClass}>
        {cfg.glowRingClass && <div className={cfg.glowRingClass} />}
        {cfg.glowRingClassLeft && <div className={cfg.glowRingClassLeft} />}
        {cfg.floatingLeaves?.map((leaf, idx) => (
          <div key={idx} className={`absolute text-3xl opacity-20 pointer-events-none ${leaf.animation}`} style={leaf.style}>
            {leaf.text}
          </div>
        ))}
        
        <div className="relative flex items-center justify-center">
          <div className={cfg.spinnerContainerClass}>
            <div className={cfg.spinnerClass} />
          </div>
          <div className={cfg.iconClass}>{cfg.icon}</div>
        </div>

        <div className="space-y-3 z-10">
          <span className={cfg.badgeClass}>{cfg.badgeText}</span>
          <h2 className={cfg.titleClass}>
            {typeof cfg.titleText === "function" ? cfg.titleText(restaurantName) : cfg.titleText}
          </h2>
          {cfg.subtitleText && (
            <p className={cfg.subtitleClass}>
              {typeof cfg.subtitleText === "function" ? cfg.subtitleText(restaurantName) : cfg.subtitleText}
            </p>
          )}
        </div>

        <div className={cfg.footerClass}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.footerDotColor}`} />
          {cfg.footerText}
        </div>
      </div>
    );
  };

  const renderWelcomeScreen = () => {
    const themeObj = CUSTOMER_THEMES.find(t => t.id === customerTheme) || CUSTOMER_THEMES[0];
    const cfg = themeObj.welcome;
    return (
      <div className={cfg.bgClass}>
        {cfg.glowRingClass && <div className={cfg.glowRingClass} />}
        {cfg.glowRingClassLeft && <div className={cfg.glowRingClassLeft} />}
        {cfg.floatingLeaves?.map((leaf, idx) => (
          <div key={idx} className={`absolute text-3xl opacity-20 pointer-events-none ${leaf.animation}`} style={leaf.style}>
            {leaf.text}
          </div>
        ))}

        <div className="text-center pt-8 space-y-1">
          <span className={cfg.badgeClass}>
            {typeof cfg.badgeText === "function" ? cfg.badgeText(greeting) : cfg.badgeText}
          </span>
          <h1 className={cfg.welcomeClass}>
            {cfg.welcomeText}
          </h1>
          <p className={cfg.restaurantNameClass}>
            {restaurantName}
          </p>
        </div>

        <div className={cfg.cardClass}>
          <div className={cfg.iconClass}>
            {cfg.icon}
          </div>
          
          <div className="space-y-2">
            <p className={`${cfg.tableLabelClass} text-xs font-semibold`}>
              You are dining at
            </p>
            <div className={cfg.tableBadgeClass}>
               Table {tableNo}
            </div>
          </div>

          <div className={cfg.bulletContainerClass}>
            {cfg.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className={cfg.bulletIconColor}>{bullet.icon}</span>
                <span>{bullet.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-8 text-center space-y-4">
          <button
            onClick={() => setHasEntered(true)}
            className={cfg.buttonClass}
          >
            Explore Menu & Order
          </button>
          <p className="text-[9px] opacity-60 font-black uppercase tracking-widest">
            {cfg.footerText}
          </p>
        </div>
      </div>
    );
  };

  const theme = getThemeClasses();

  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 text-center space-y-6 relative overflow-hidden select-none">
        <div className="absolute -right-24 -top-24 w-48 h-48 bg-[#ff5722]/10 rounded-full blur-3xl" />
        <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
        
        <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-4xl shadow-2xl animate-pulse">
          
        </div>
        
        <div className="space-y-2 max-w-sm">
          <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-[9px] font-black uppercase tracking-widest">
            Session Expired (10 Min Inactivity)
          </span>
          <h2 className="text-xl font-black tracking-tight leading-tight">Dining Session Locked</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            For table security and to prevent unauthorized remote orders, guest sessions automatically expire after 10 minutes of inactivity. 
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 p-4.5 rounded-2xl max-w-sm text-left space-y-2 mt-4">
          <p className="text-[10px] font-black text-[#ff5722] uppercase tracking-wider flex items-center gap-1.5">
            <span></span> How to reactivate?
          </p>
          <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
            Please scan the physical QR code label on your dining table ( {tableNo || ""}) again. This will immediately start a fresh 10-minute session for your device.
          </p>
        </div>

        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-8">RESTUVEXO Restaurant Operating System</p>
      </div>
    );
  }

  if (!mounted || loading) {
    if (!showLoader) return null;
    return renderLoadingScreen();
  }

  if (!hasEntered) {
    return renderWelcomeScreen();
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between relative transition-colors duration-300 font-sans ${theme.wrapper}`}>
      
      {/* Header banner */}
      <div className={`p-6 rounded-b-[2.5rem] shadow-xl text-center space-y-2 relative overflow-hidden transition-all duration-300 ${theme.headerBanner}`}>
        <div className="absolute -right-16 -top-16 w-36 h-36 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className={`text-[9px] font-black uppercase tracking-widest ${theme.headerAccentText}`}>
            RESTUVEXO Smart Dining
          </span>
        </div>
        
        <h1 className="text-2xl font-black tracking-tight leading-none">{restaurantName}</h1>
        
        <p className="text-[10px] font-bold text-slate-300">
          Ordering live from: <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase shadow-sm ${theme.accentBadge}`}> Table {tableNo}</span>
        </p>
      </div>

      {/* View-only banner when ordering is offline */}
      {!qrOrderingEnabled && (
        <div className="bg-orange-500/10 border border-orange-500/20 text-[#ff5722] px-4 py-3 mx-4 mt-4 rounded-2xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-inner animate-pulse">
          <span> VIEW-ONLY DIGITAL MENU (Ordering Offline)</span>
        </div>
      )}

      {/* Main categories scrolling & search */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-xs"></span>
          <input
            type="text"
            placeholder="Search favorite curries, naan, rolls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 text-xs px-4 py-3 rounded-2xl border focus:outline-none transition-all duration-300 ${theme.inputBg}`}
          />
        </div>

        {/* Categories scroll */}
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-4.5 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition active:scale-95 ${selectedCategory === "All" ? theme.pillActive : theme.pillInactive}`}
          >
             All Categories
          </button>
          {categories.map((c, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-4.5 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition active:scale-95 ${selectedCategory === c.name ? theme.pillActive : theme.pillInactive}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu list */}
      <div className="flex-1 px-4 pb-36 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
          {filteredMenuItems.length === 0 ? (
            <div className="col-span-full py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              No active dishes match your search.
            </div>
          ) : (
            filteredMenuItems.map((item, idx) => (
              <div 
                key={item.id} 
                className={`p-4 md:p-5 rounded-[2rem] flex justify-between gap-4 transition-all duration-300 animate-fade-in-up border border-slate-100/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] ${theme.cardBg}`}
                style={{ animationDelay: `${(idx % 10) * 40}ms` }}
              >
                {/* Left Content */}
                <div className="space-y-2.5 flex-1 py-1 text-left">
                  <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${theme.accentText}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                    {item.category?.name || "Uncategorized"}
                  </span>
                  <div className="space-y-1">
                    <h4 className={`font-black text-[15px] md:text-base leading-snug tracking-tight ${theme.itemCardTitle}`}>
                      {item.name}
                    </h4>
                    <p className={`text-[13px] md:text-sm font-black ${theme.itemCardPrice}`}>
                      ₹{parseFloat(item.price).toFixed(2)}
                    </p>
                  </div>
                  {item.trackStock && item.stockQty > 0 && item.stockQty <= 5 && (
                    <p className="text-[9px] font-bold text-rose-500 animate-pulse">
                      Only {item.stockQty} left!
                    </p>
                  )}
                </div>
                
                {/* Right Image & Add Button */}
                <div className="relative shrink-0 w-[120px] h-[120px] md:w-[140px] md:h-[140px]">
                  {item.imageUrl ? (
                    <div className="w-full h-full rounded-[1.5rem] overflow-hidden bg-slate-100 shadow-inner">
                      <img 
                        src={item.imageUrl.startsWith('http') ? item.imageUrl : `${BACKEND_URL}${item.imageUrl}`} 
                        alt={item.name}
                        className="w-full h-full object-cover transition duration-500 hover:scale-110"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shadow-inner">
                       <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                       </svg>
                    </div>
                  )}
                  
                  {/* Floating Add Button */}
                  <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-10">
                    {qrOrderingEnabled && (
                      item.trackStock && item.stockQty <= 0 ? (
                        <span className="px-5 py-2 text-[9px] font-black rounded-xl uppercase tracking-wider bg-white border border-slate-200 text-slate-400 shadow-md whitespace-nowrap">
                          Sold Out
                        </span>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className={`px-6 py-2 md:py-2.5 text-[11px] font-black rounded-xl uppercase tracking-wider shadow-[0_4px_15px_-3px_rgba(0,0,0,0.3)] transition active:scale-95 flex items-center justify-center gap-1 border-[2.5px] border-white whitespace-nowrap ${theme.accentBtn}`}
                        >
                          ADD <span className="text-[13px] leading-none">+</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FLOATING ACTIVE KOTs PROGRESS RADAR (COLLAPSED STATE TRIGGER) */}
      {activeOrders.length > 0 && !trackerExpanded && (
        <button
          onClick={() => setTrackerExpanded(true)}
          className="fixed bottom-4 right-4 bg-slate-950 text-white border border-slate-800 p-4 rounded-full shadow-2xl z-40 flex items-center gap-2 hover:bg-slate-900 transition active:scale-95"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[8px] font-black uppercase tracking-widest pr-1"> KOT Radar ({activeOrders.length})</span>
        </button>
      )}

      {/* FLOATING ACTIVE KOTs PROGRESS RADAR (EXPANDED PANEL) */}
      {activeOrders.length > 0 && trackerExpanded && (
        <div className="fixed bottom-4 inset-x-4 bg-slate-950/95 backdrop-blur-xl border border-slate-800/80 p-5 rounded-[2.5rem] shadow-2xl z-40 max-w-sm mx-auto text-white space-y-3.5">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h3 className="font-black text-slate-100 text-[10px] uppercase tracking-wider">
                 Live KOT Progress Radar
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-white/10 rounded-full text-[8px] font-black text-slate-300 uppercase tracking-widest">
                {activeOrders.length} KOTs Active
              </span>
              <button
                onClick={() => setTrackerExpanded(false)}
                className="text-slate-500 hover:text-white font-bold text-xs px-1"
              >
                
              </button>
            </div>
          </div>

          <div className="max-h-[22vh] overflow-y-auto space-y-2.5 pr-0.5 scrollbar-none">
            {activeOrders.map((ord) => {
              let statusLabel = "Pending Approval ";
              let badgeColor = "bg-orange-500/10 text-orange-400 border-orange-500/20";
              
              if (ord.status === "cooking") {
                statusLabel = "Cooking in Kitchen ";
                badgeColor = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse";
              } else if (ord.status === "ready") {
                statusLabel = "Ready to Serve ";
                badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-bounce";
              } else if (ord.status === "completed") {
                statusLabel = "Served ";
                badgeColor = "bg-slate-800 text-slate-400 border-slate-700";
              } else if (ord.status === "cancelled") {
                statusLabel = "Cancelled ";
                badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
              }

              return (
                <div key={ord.id} className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl space-y-2 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-wide">
                      KOT #{ord.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${badgeColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <ul className="space-y-1 pl-1">
                    {ord.orderItems?.map((item, oidx) => (
                      <li key={oidx} className="flex justify-between text-[10px] font-bold text-slate-300">
                        <span>• {item.menuItem?.name}</span>
                        <span className="text-emerald-400 font-black">x{item.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTTOM SLIDING DRAWER: ACTIVE VISITOR CART */}
      {cart.length > 0 && qrOrderingEnabled && (
        <div className={`fixed bottom-0 inset-x-0 p-5 rounded-t-[2.5rem] z-40 max-w-sm mx-auto space-y-4 backdrop-blur-xl ${theme.footerCart}`}>
          
          <div className="flex justify-between items-center border-b border-slate-100/80 pb-3">
            <h3 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
              <span></span> Your Table Cart ({cart.reduce((s, i) => s + i.qty, 0)} Items)
            </h3>
            
            <button
              onClick={() => setCart([])}
              className="text-[9px] font-black text-rose-500 uppercase tracking-widest transition active:scale-95"
            >
              Clear Cart
            </button>
          </div>

          {/* Cart items scroll */}
          <div className="max-h-[22vh] overflow-y-auto space-y-3 pr-1 text-left">
            {cart.map(item => (
              <div key={item.menuItemId} className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-2xl space-y-2 shadow-sm text-left">
                <div className="flex justify-between items-start gap-4">
                  <p className="text-[11px] font-black text-slate-900 truncate leading-snug">{item.name}</p>
                  <button onClick={() => updateQty(item.menuItemId, -item.qty)} className="text-slate-350 hover:text-rose-500 font-bold text-[10px] transition"></button>
                </div>
                
                <div className="flex justify-between items-center gap-4">
                  <input
                    type="text"
                    placeholder="E.g. Less spicy, sugar-free..."
                    value={item.note}
                    onChange={(e) => updateItemNote(item.menuItemId, e.target.value)}
                    className="text-[9px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-650 focus:outline-none flex-1 placeholder:text-slate-300 font-bold focus:border-[#ff5722]/30"
                  />
                  
                  <div className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-lg p-0.5 shadow-sm shrink-0">
                    <button onClick={() => updateQty(item.menuItemId, -1)} className="w-5.5 h-5.5 bg-slate-50 rounded flex items-center justify-center font-bold text-xs transition active:scale-90">-</button>
                    <span className="text-[10px] font-black px-1 text-slate-800">{item.qty}</span>
                    <button onClick={() => updateQty(item.menuItemId, 1)} className="w-5.5 h-5.5 bg-slate-50 rounded flex items-center justify-center font-bold text-xs transition active:scale-90">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CUSTOMER INFO CHECKOUT DETAILS FORM */}
          <div className="bg-slate-50/70 border border-slate-150 p-4 rounded-2xl space-y-3">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none text-left"> Guest Checkout Details</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="text-left">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-1">Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-[10px] bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-bold placeholder:text-slate-350 focus:outline-none text-slate-850"
                />
              </div>
              
              <div className="text-left">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-1">Mobile Number (Optional)</label>
                <div className="flex gap-1">
                  <div className="relative w-16 shrink-0 flex items-center bg-white border border-slate-200 rounded-lg focus-within:border-slate-300 transition">
                    <span className="pl-2 text-[10px] text-slate-450 font-bold select-none">+</span>
                    <input
                      type="tel"
                      maxLength={4}
                      value={customerPhoneCode}
                      onChange={(e) => setCustomerPhoneCode(e.target.value.replace(/\D/g, ""))}
                      className="bg-transparent text-slate-850 text-[10px] pl-0.5 pr-2 py-2 w-full font-bold focus:outline-none text-center"
                      required
                    />
                  </div>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={customerPhoneBody}
                    onChange={(e) => setCustomerPhoneBody(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 min-w-0 text-[10px] bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-bold placeholder:text-slate-350 focus:outline-none text-slate-850"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Price calculations */}
          <div className="border-t border-dashed border-slate-150 pt-3 flex justify-between items-center">
            <div className="text-left">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Payable</p>
              <p className="text-base font-black text-slate-950">₹{grandTotal.toFixed(2)}</p>
            </div>
            
            <button
              onClick={handlePlaceSelfOrder}
              disabled={placingOrder}
              className={`px-6 py-3.5 font-black text-[10px] tracking-widest uppercase rounded-2xl shadow-md transition active:scale-95 shrink-0 ${theme.accentBtn}`}
            >
              {placingOrder ? "Dispatching..." : " Place Table Order"}
            </button>
          </div>

        </div>
      )}

      {/* Global Toast */}
      {toast.show && (
        <div className="fixed top-4 inset-x-4 z-[100] flex justify-center pointer-events-none">
          <div className={`backdrop-blur-xl border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm pointer-events-auto ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600" 
              : "bg-slate-900/95 border-slate-800 text-slate-100"
          }`}>
            <span className="text-xs">
              {toast.type === "success" ? "" : ""}
            </span>
            <p className="text-[10px] font-black tracking-wide leading-relaxed truncate">{toast.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}
