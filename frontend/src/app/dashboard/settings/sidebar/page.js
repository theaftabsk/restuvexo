"use client";
import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function SidebarSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Sidebar Settings States
  const [sidebarTheme, setSidebarTheme] = useState("light");
  const [sidebarQuickActions, setSidebarQuickActions] = useState(true);
  const [sidebarStoreSwitch, setSidebarStoreSwitch] = useState(true);
  const [sidebarCollapsible, setSidebarCollapsible] = useState(true);
  const [sidebarHiddenItems, setSidebarHiddenItems] = useState([]);

  // Store initial settings to detect changes
  const [initialSettings, setInitialSettings] = useState(null);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  // List of all customizable modules
  const modules = [
    { name: "POS Billing", path: "/dashboard/pos", icon: "" },
    { name: "Orders Manager", path: "/dashboard/orders", icon: "" },
    { name: "QR Code Approvals", path: "/dashboard/qr", icon: "" },
    { name: "Kitchen Display (KDS)", path: "/dashboard/kds", icon: "‍" },
    { name: "Dashboard Overview", path: "/dashboard", icon: "" },
    { name: "Analytics & Reports", path: "/dashboard/reports", icon: "" },
    { name: "Menu Catalog", path: "/dashboard/menu", icon: "" },
    { name: "Table Settings", path: "/dashboard/tables", icon: "" },
    { name: "Inventory Stock", path: "/dashboard/inventory", icon: "" },
    { name: "Expenses Tracker", path: "/dashboard/expenses", icon: "" },
  ];

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const theme = data.sidebarTheme || "light";
          const quickActions = data.sidebarQuickActions !== false;
          const storeSwitch = data.sidebarStoreSwitch !== false;
          const collapsible = data.sidebarCollapsible !== false;
          const hiddenItems = data.sidebarHiddenItems || [];

          setSidebarTheme(theme);
          setSidebarQuickActions(quickActions);
          setSidebarStoreSwitch(storeSwitch);
          setSidebarCollapsible(collapsible);
          setSidebarHiddenItems(hiddenItems);

          setInitialSettings({
            sidebarTheme: theme,
            sidebarQuickActions: quickActions,
            sidebarStoreSwitch: storeSwitch,
            sidebarCollapsible: collapsible,
            sidebarHiddenItems: hiddenItems
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: "", type: "" });
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const payload = {
      sidebarTheme,
      sidebarQuickActions,
      sidebarStoreSwitch,
      sidebarCollapsible,
      sidebarHiddenItems
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage({ text: "Sidebar configuration updated successfully! Changes will sync in real-time.", type: "success" });
        setInitialSettings({
          sidebarTheme,
          sidebarQuickActions,
          sidebarStoreSwitch,
          sidebarCollapsible,
          sidebarHiddenItems
        });
        setTimeout(() => setMessage({ text: "", type: "" }), 4000);
      } else {
        setMessage({ text: "Failed to update settings.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Toggle Module Visibility
  const handleToggleModule = (path) => {
    if (sidebarHiddenItems.includes(path)) {
      setSidebarHiddenItems(sidebarHiddenItems.filter(p => p !== path));
    } else {
      setSidebarHiddenItems([...sidebarHiddenItems, path]);
    }
  };

  // Theme change callback
  const handleThemeChange = (themeName) => {
    setSidebarTheme(themeName);
  };

  const hasChanges = initialSettings && (
    sidebarTheme !== initialSettings.sidebarTheme ||
    sidebarQuickActions !== initialSettings.sidebarQuickActions ||
    sidebarStoreSwitch !== initialSettings.sidebarStoreSwitch ||
    sidebarCollapsible !== initialSettings.sidebarCollapsible ||
    JSON.stringify(sidebarHiddenItems.sort()) !== JSON.stringify(initialSettings.sidebarHiddenItems.slice().sort())
  );

  if (loading) {
    return <LoadingScreen message="Loading navigation preferences..." minHeight="50vh" />;
  }

  // Generate dynamic styles for the interactive smartphone mock preview
  const getPreviewClasses = () => {
    switch (sidebarTheme) {
      case "dark":
        return {
          aside: "bg-slate-950 text-slate-100 border-slate-900",
          accent: "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm",
          logo: "text-amber-500",
          badge: "bg-amber-500 text-slate-950"
        };
      case "light":
      default:
        return {
          aside: "bg-white text-slate-800 border-slate-100",
          accent: "bg-gradient-to-r from-[#ff5722] to-[#ff7a47] text-white shadow-sm",
          logo: "text-[#ff5722]",
          badge: "bg-[#ff5722] text-white"
        };
    }
  };

  const preview = getPreviewClasses();

  return (
    <div className="space-y-8 text-left">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Sidebar Customization</h2>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Configure accent themes, toggle quick modules, and customize layouts</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold ${
          message.type === "success" 
            ? "bg-emerald-50 border border-emerald-100 text-emerald-700" 
            : "bg-rose-50 border border-rose-100 text-rose-700"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Settings Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Themes */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Select Sidebar Theme</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Sunset Orange (Light) */}
              <button 
                onClick={() => handleThemeChange("light")}
                className={`p-4 rounded-2.5xl border text-left transition-all duration-300 relative overflow-hidden group ${
                  sidebarTheme === "light" 
                    ? "border-[#ff5722] bg-orange-50/20 shadow-md shadow-orange-500/5 scale-[1.02]" 
                    : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#ff5722]" />
                  <span className="text-xs font-black text-slate-800">Light Theme</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Sunset Orange & Clean White</p>
              </button>

              {/* Midnight Luxury (Dark) */}
              <button 
                onClick={() => handleThemeChange("dark")}
                className={`p-4 rounded-2.5xl border text-left transition-all duration-300 relative overflow-hidden group ${
                  sidebarTheme === "dark" 
                    ? "border-amber-500 bg-amber-50/10 shadow-md shadow-amber-500/5 scale-[1.02]" 
                    : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-black text-slate-800">Dark Theme</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Midnight Luxury Gold & Charcoal</p>
              </button>

            </div>
          </div>

          {/* Section 2: Layout Preferences Switches */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Interface Preferences</h3>
            <div className="bg-slate-50/60 border border-slate-200/60 rounded-3xl p-5 space-y-4">
              
              {/* Quick Actions Switch */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-800"> Quick Actions Panel</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Show shortcut commands button on sidebar header</p>
                </div>
                <button
                  onClick={() => setSidebarQuickActions(!sidebarQuickActions)}
                  className={`w-11 h-6 rounded-full transition-colors duration-300 relative flex items-center ${
                    sidebarQuickActions ? "bg-slate-900" : "bg-slate-200"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow absolute ${
                    sidebarQuickActions ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>

              {/* Store Operational Switch */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-black text-slate-800"> Store Operational Status Toggle</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Allow toggling self-ordering pause mode from sidebar</p>
                </div>
                <button
                  onClick={() => setSidebarStoreSwitch(!sidebarStoreSwitch)}
                  className={`w-11 h-6 rounded-full transition-colors duration-300 relative flex items-center ${
                    sidebarStoreSwitch ? "bg-slate-900" : "bg-slate-200"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow absolute ${
                    sidebarStoreSwitch ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>

              {/* Collapsible Headers Switch */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-black text-slate-800"> Collapsible Navigation Accordions</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Allow users to minimize categories like live terminals</p>
                </div>
                <button
                  onClick={() => setSidebarCollapsible(!sidebarCollapsible)}
                  className={`w-11 h-6 rounded-full transition-colors duration-300 relative flex items-center ${
                    sidebarCollapsible ? "bg-slate-900" : "bg-slate-200"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow absolute ${
                    sidebarCollapsible ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>

            </div>
          </div>

          {/* Section 3: Modules Visibility Toggle List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Module Control Settings</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Check a module to show it, uncheck to hide it from visitors & sidebar navigation.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {modules.map((mod) => {
                const isVisible = !sidebarHiddenItems.includes(mod.path);
                return (
                  <button
                    key={mod.path}
                    onClick={() => handleToggleModule(mod.path)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isVisible 
                        ? "border-slate-200 bg-white hover:bg-slate-50/50" 
                        : "border-slate-100 bg-slate-50/40 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{mod.icon}</span>
                      <span className="text-xs font-black text-slate-700">{mod.name}</span>
                    </div>
                    
                    {/* Checkbox indicator */}
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                      isVisible 
                        ? "bg-slate-900 border-slate-900 text-white" 
                        : "bg-white border-slate-200 text-transparent"
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`w-full py-3.5 rounded-2.5xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
                hasChanges 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/15 hover:scale-[1.01] active:scale-95 cursor-pointer"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-70"
              }`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span></span>
                  <span>{hasChanges ? "Save Configuration" : "No Changes to Save"}</span>
                </>
              )}
            </button>
            {hasChanges && (
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider text-center mt-2.5 animate-pulse">
                 You have unsaved configuration changes! Click Save to apply.
              </p>
            )}
          </div>

        </div>

        {/* Real-time Smartphone Live Preview Mockup */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-28 space-y-3 w-full max-w-[280px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">
               Live Sidebar Preview
            </span>
            
            {/* Phone Body */}
            <div className="w-full aspect-[9/18.5] bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl shadow-slate-900/10 border-4 border-slate-900 relative overflow-hidden flex flex-col">
              
              {/* Screen Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-900 rounded-b-xl z-20" />
              
              {/* Sidebar View Container */}
              <div className={`flex-1 rounded-[1.8rem] overflow-hidden flex flex-col border transition-colors duration-300 relative ${preview.aside}`}>
                
                {/* Brand Header Preview */}
                <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2 pt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm border border-slate-100">
                      <img src="/restuvexo_logo.png" alt="RESTUVEXO Logo" className="w-full h-full object-cover p-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-0.5 leading-none">
                        <span className="font-black text-sm tracking-tight">RESTUVEXO</span>
                        <span className={`w-1 h-1 rounded-full ${preview.logo}`} />
                      </div>
                      <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">ROS SYSTEM</span>
                    </div>
                  </div>

                  {/* Settings toggles preview */}
                  <div className="space-y-1.5 mt-1">
                    <div className={`flex items-center justify-between px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider ${preview.accent}`}>
                      <span>WORKSPACE</span>
                      <span>LIVE</span>
                    </div>
                    {sidebarStoreSwitch && (
                      <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-[6.5px] font-black uppercase">
                        <span> accepting orders</span>
                        <span className="text-[5px]">switch</span>
                      </div>
                    )}
                    {sidebarQuickActions && (
                      <div className="w-full py-1 bg-slate-900 text-white text-[7px] font-black rounded-lg text-center uppercase tracking-widest">
                         Quick Action
                      </div>
                    )}
                  </div>
                </div>

                {/* Modules Navigation Preview */}
                <div className="flex-1 p-2 space-y-3.5 overflow-y-auto scrollbar-none text-[8.5px]">
                  
                  {[
                    {
                      title: "OVERVIEW",
                      items: [
                        { name: "Dashboard Overview", path: "/dashboard", icon: "" }
                      ]
                    },
                    {
                      title: "LIVE TERMINALS",
                      items: [
                        { name: "POS Billing", path: "/dashboard/pos", icon: "" },
                        { name: "Orders Manager", path: "/dashboard/orders", icon: "" },
                        { name: "QR Code Approvals", path: "/dashboard/qr", icon: "" },
                        { name: "Kitchen Display (KDS)", path: "/dashboard/kds", icon: "‍" }
                      ]
                    },
                    {
                      title: "REPORTS",
                      items: [
                        { name: "Analytics & Reports", path: "/dashboard/reports", icon: "" }
                      ]
                    },
                    {
                      title: "MANAGEMENT",
                      items: [
                        { name: "Menu Catalog", path: "/dashboard/menu", icon: "" },
                        { name: "Table Settings", path: "/dashboard/tables", icon: "" },
                        { name: "Inventory Stock", path: "/dashboard/inventory", icon: "" },
                        { name: "Expenses Tracker", path: "/dashboard/expenses", icon: "" }
                      ]
                    }
                  ].map((group) => {
                    const visibleItems = group.items.filter(item => !sidebarHiddenItems.includes(item.path));
                    if (visibleItems.length === 0) return null;

                    return (
                      <div key={group.title} className="space-y-1">
                        <div className="flex items-center justify-between px-1.5 text-[6.5px] font-black text-slate-400 tracking-wider">
                          <span>{group.title}</span>
                          {sidebarCollapsible && <span></span>}
                        </div>
                        <div className="space-y-0.5">
                          {visibleItems.map((item) => {
                            const isDemoActive = item.name === "Dashboard Overview";
                            return (
                              <div
                                key={item.path}
                                className={`flex items-center gap-2 p-1.5 rounded-lg border text-[7.5px] font-bold ${
                                  isDemoActive 
                                    ? preview.accent 
                                    : "border-transparent text-slate-500"
                                }`}
                              >
                                <span>{item.icon}</span>
                                <span className="truncate">{item.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                </div>

                {/* Footer Preview */}
                <div className="p-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center font-black text-[9px] ${preview.badge}`}>
                      J
                    </div>
                    <div className="min-w-0">
                      <p className="text-[7.5px] font-black truncate leading-tight">John Doe</p>
                      <p className="text-[6px] font-bold text-slate-400">OWNER</p>
                    </div>
                  </div>
                  <span className="text-slate-350 text-xs"></span>
                </div>

              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider">
              Real-Time mockup updates as you adjust layout themes.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
