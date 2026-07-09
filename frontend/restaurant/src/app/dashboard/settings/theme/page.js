"use client";

import { useState, useEffect } from "react";
import { CUSTOMER_THEMES } from "@/config/customerThemes";
import LoadingScreen from "@/components/LoadingScreen";

export default function DinerThemeSettings() {
  const [customerTheme, setCustomerTheme] = useState("sunset");
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.customerTheme) {
            setCustomerTheme(data.customerTheme);
            localStorage.setItem("customerTheme", data.customerTheme);
          }
        }
      } catch (e) {
        console.error("Failed to load settings from server:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSetting = async (themeName) => {
    const token = localStorage.getItem("authToken");
    try {
      // First fetch current settings to preserve other values
      const getRes = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      let qrOrderingEnabled = true;
      if (getRes.ok) {
        const currentData = await getRes.json();
        qrOrderingEnabled = currentData.qrOrderingEnabled !== false;
      }

      const payload = {
        qrOrderingEnabled,
        customerTheme: themeName
      };

      const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (e) {
      console.error("Failed to persist settings on server:", e);
    }
  };

  const handleSelectTheme = (themeName) => {
    setCustomerTheme(themeName);
    localStorage.setItem("customerTheme", themeName);
    saveSetting(themeName);
  };

  if (loading) {
    return <LoadingScreen message="Loading theme engine..." minHeight="50vh" />;
  }

  // Helper to render the live theme preview mock screen inside a realistic device shell
  const renderThemePreview = () => {
    const themeObj = CUSTOMER_THEMES.find(t => t.id === customerTheme) || CUSTOMER_THEMES[0];
    const theme = themeObj.classes;
    // Replace "min-h-screen" in wrapper class to correctly scale inside the smartphone frame
    const previewWrapperClass = theme.wrapper.replace("min-h-screen", "h-full min-h-0");
    
    return (
      <div className="relative mx-auto w-[270px] h-[500px] bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800 ring-2 ring-slate-900/10 flex flex-col justify-between overflow-hidden">
        {/* Smartphone Speaker/Camera Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-b-xl z-20 flex items-center justify-center gap-1.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          <span className="w-8 h-0.5 rounded-full bg-slate-850" />
        </div>
        
        {/* Mock Screen Canvas */}
        <div className={`w-full h-full rounded-[1.8rem] overflow-hidden relative flex flex-col justify-between p-3.5 pt-6 select-none transition-all duration-300 ${previewWrapperClass}`}>
          {/* Glow rings / floating leaves */}
          {themeObj.welcome.glowRingClass && <div className={`${themeObj.welcome.glowRingClass} opacity-40`} />}
          {themeObj.welcome.floatingLeaves?.map((leaf, idx) => (
            <div key={idx} className={`absolute text-xl opacity-20 pointer-events-none ${leaf.animation}`} style={leaf.style}>
              {leaf.text}
            </div>
          ))}
          
          <div className="space-y-3 z-10">
            {/* Header banner */}
            <div className={`p-3.5 rounded-2xl text-center space-y-1 relative shadow-md transition-all duration-300 ${theme.headerBanner}`}>
              <div className="flex items-center justify-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className={`text-[7px] font-black uppercase tracking-widest ${theme.headerAccentText || "text-white"}`}>
                  Smart Dining
                </span>
              </div>
              <h4 className="text-[10px] font-black tracking-tight leading-none">RESTUVEXO Café & Diner</h4>
              <p className="text-[8px] font-semibold opacity-80"> Table 7</p>
            </div>

            {/* Menu list demo */}
            <div className="space-y-2 pt-2">
              <div className={`p-2.5 rounded-[1.2rem] flex justify-between gap-2 transition-all duration-300 shadow-sm ${theme.cardBg}`}>
                {/* Left Content */}
                <div className="space-y-1.5 flex-1 py-0.5 text-left">
                  <span className={`inline-flex items-center gap-1 text-[5px] font-black uppercase tracking-widest ${theme.accentText}`}>
                    <span className="w-1 h-1 rounded-full bg-current opacity-70"></span>
                    Dine-in Special
                  </span>
                  <div className="space-y-0.5">
                    <h5 className={`font-black text-[9px] leading-snug tracking-tight line-clamp-2 ${theme.itemCardTitle}`}>
                      Classic Tandoori Chicken Tikka
                    </h5>
                    <p className={`text-[8px] font-black ${theme.itemCardPrice}`}>
                      ₹240.00
                    </p>
                  </div>
                </div>
                
                {/* Right Image & Add Button */}
                <div className="relative shrink-0 w-[60px] h-[60px]">
                  <div className="w-full h-full rounded-[0.9rem] overflow-hidden bg-slate-100 shadow-inner">
                    <img 
                      src="https://images.unsplash.com/photo-1599487405270-8789539ee647?q=80&w=200&auto=format&fit=crop" 
                      alt="Tandoori Chicken"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Floating Add Button */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
                    <button className={`px-2.5 py-1 text-[6px] font-black rounded-lg uppercase tracking-wider shadow-md transition active:scale-95 flex items-center justify-center gap-0.5 border-2 border-white whitespace-nowrap ${theme.accentBtn}`}>
                      ADD <span className="text-[7px] leading-none">+</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky footer checkout bar */}
          <div className={`p-3 rounded-xl flex justify-between items-center mt-4 shadow-md transition-all duration-300 ${theme.footerCart}`}>
            <div className="text-left">
              <p className="text-[6px] font-black opacity-60 uppercase tracking-widest">Payable</p>
              <p className="text-[10px] font-black">₹280.00</p>
            </div>
            <button className={`px-3 py-2 font-black text-[7px] tracking-widest uppercase rounded-lg transition active:scale-95 ${theme.accentBtn}`}>
              Place Order
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-16">
      
      {/* Dynamic Saved Toast */}
      {isSaved && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className="bg-emerald-500/10 border border-emerald-500/25 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-emerald-600 backdrop-blur-xl">
            <span className="text-xs"></span>
            <p className="text-[11px] font-black tracking-wide uppercase">Menu Theme Updated Live!</p>
          </div>
        </div>
      )}

      <div className="text-left">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Menu Theme</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Select a gorgeous layout theme for table self-ordering visitors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMNS: THEMES SELECTOR */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-6">
            <div className="text-left border-b border-slate-50 pb-4">
              <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-[#ff5722] rounded-full text-[8px] font-black uppercase tracking-widest">Brand Customize</span>
              <h3 className="text-sm font-black text-slate-900 mt-2">Diner QR Landing Theme</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Choose your customer interface design</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {CUSTOMER_THEMES.map((themeObj) => (
                <button
                  key={themeObj.id}
                  type="button"
                  onClick={() => handleSelectTheme(themeObj.id)}
                  className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition active:scale-99 w-full ${
                    customerTheme === themeObj.id 
                      ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20" 
                      : "bg-slate-50/55 border-slate-150 hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full border border-white mt-1 shrink-0 flex items-center justify-center" style={{ backgroundColor: themeObj.color }}>
                    {customerTheme === themeObj.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="space-y-1 text-left flex-1 min-w-0">
                    <span className="text-xs font-black uppercase tracking-wider block">{themeObj.name}</span>
                    <p className={`text-[10px] leading-relaxed font-semibold ${customerTheme === themeObj.id ? "text-slate-350" : "text-slate-450"}`}>
                      {themeObj.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THEME LIVE MOCKUP PREVIEW */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-4 flex flex-col items-center">
          <div className="w-full text-left">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none"> Live Customer Interface Preview</span>
            <p className="text-[10px] font-semibold text-slate-500 leading-snug mt-1">Changes are compiled in real-time. Scan your table QR code to see it live on any mobile device.</p>
          </div>
          {renderThemePreview()}
        </div>

      </div>

    </div>
  );
}
