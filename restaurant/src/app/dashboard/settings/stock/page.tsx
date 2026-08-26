import { getBackendUrl } from "@/config/api";
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ShieldAlert, Zap, Layers, Bell, CheckCircle2, AlertTriangle, ArrowRight, Save, Scale } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

export default function StockSettings() {
  const BACKEND_URL = getBackendUrl();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Settings State
  const [settings, setSettings] = useState({
    inventoryMode: "full_inventory", // 'disabled' | 'basic_stock' | 'full_inventory'
    deductionTrigger: "on_kot_sent", // 'on_kot_sent' | 'on_order_completed'
    negativeStockPolicy: "block_sale", // 'block_sale' | 'allow_with_warning' | 'allow_silent'
    lowStockAlertEnabled: true,
    autoOutOfStockEnabled: true
  });

  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchStockSettings();
  }, []);

  const fetchStockSettings = async () => {
    setLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          inventoryMode: data.inventoryMode || "full_inventory",
          deductionTrigger: data.deductionTrigger || "on_kot_sent",
          negativeStockPolicy: data.negativeStockPolicy || "block_sale",
          lowStockAlertEnabled: data.lowStockAlertEnabled !== undefined ? data.lowStockAlertEnabled : true,
          autoOutOfStockEnabled: data.autoOutOfStockEnabled !== undefined ? data.autoOutOfStockEnabled : true
        });
      }
    } catch (err) {
      console.error("Failed to load stock settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast("Stock settings saved and applied across all terminals!", "success");
      } else {
        triggerToast(data.error || "Failed to save settings", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading stock configurations..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl text-slate-800 font-sans pb-16 text-left">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up border ${
            toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-750" : "bg-slate-900 border-slate-700 text-white"
          }`}
        >
          <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-current animate-pulse" />
          <span className="text-[11px] font-black tracking-wide uppercase">{toast.msg}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Package className="w-7 h-7 text-[#ff5722]" />
          Stock Control & Inventory Rules
        </h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
          Configure real-time deduction triggers, BOM recipe policies, and terminal limits
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Inventory Tracking Mode */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Inventory Tracking Engine</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Select how stock is tracked across POS and QR self-ordering
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase rounded-full">
              Live Database Connected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Full Inventory */}
            <div
              onClick={() => setSettings({ ...settings, inventoryMode: "full_inventory" })}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                settings.inventoryMode === "full_inventory"
                  ? "border-[#ff5722] bg-orange-50/40 shadow-sm"
                  : "border-slate-100 bg-slate-50/60 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#ff5722] flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  {settings.inventoryMode === "full_inventory" && (
                    <CheckCircle2 className="w-5 h-5 text-[#ff5722]" />
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Full Recipe BOM</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">
                  Deducts raw materials (e.g., 200g Chicken, 50ml Oil) automatically using configured dish recipes.
                </p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#ff5722] mt-4 block">Recommended</span>
            </div>

            {/* Basic Stock */}
            <div
              onClick={() => setSettings({ ...settings, inventoryMode: "basic_stock" })}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                settings.inventoryMode === "basic_stock"
                  ? "border-[#ff5722] bg-orange-50/40 shadow-sm"
                  : "border-slate-100 bg-slate-50/60 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  {settings.inventoryMode === "basic_stock" && (
                    <CheckCircle2 className="w-5 h-5 text-[#ff5722]" />
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Item-Level Count</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">
                  Direct item stock count (e.g., 10 Cans of Cola). Decrements item quantity per sale without raw recipes.
                </p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-4 block">Simplified</span>
            </div>

            {/* Disabled */}
            <div
              onClick={() => setSettings({ ...settings, inventoryMode: "disabled" })}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                settings.inventoryMode === "disabled"
                  ? "border-[#ff5722] bg-orange-50/40 shadow-sm"
                  : "border-slate-100 bg-slate-50/60 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  {settings.inventoryMode === "disabled" && (
                    <CheckCircle2 className="w-5 h-5 text-[#ff5722]" />
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Tracking Disabled</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">
                  Unlimited ordering without stock tracking. Terminals will never block orders for stock shortages.
                </p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-4 block">Bypass All</span>
            </div>
          </div>
        </div>

        {/* Section 2: Stock Deduction Trigger & Out-of-Stock Policy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Deduction Trigger */}
          <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Stock Deduction Trigger
            </h3>
            <p className="text-[11px] font-semibold text-slate-400">
              When should ingredients and items be deducted from inventory?
            </p>

            <div className="space-y-2.5 pt-2">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  settings.deductionTrigger === "on_kot_sent"
                    ? "bg-orange-50/50 border-[#ff5722]"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="deductionTrigger"
                  checked={settings.deductionTrigger === "on_kot_sent"}
                  onChange={() => setSettings({ ...settings, deductionTrigger: "on_kot_sent" })}
                  className="mt-1 accent-[#ff5722]"
                />
                <div>
                  <p className="text-xs font-black text-slate-900">On KOT / Order Placement (Instant)</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    Deducts stock immediately when cashier presses Punch or diner sends QR order.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  settings.deductionTrigger === "on_order_completed"
                    ? "bg-orange-50/50 border-[#ff5722]"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="deductionTrigger"
                  checked={settings.deductionTrigger === "on_order_completed"}
                  onChange={() => setSettings({ ...settings, deductionTrigger: "on_order_completed" })}
                  className="mt-1 accent-[#ff5722]"
                />
                <div>
                  <p className="text-xs font-black text-slate-900">On Bill Settlement (Paid)</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    Deducts stock only after the order is marked paid and settled at cashier desk.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Negative Stock Policy */}
          <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Negative Stock Policy
            </h3>
            <p className="text-[11px] font-semibold text-slate-400">
              How should terminals behave when an ingredient hits zero?
            </p>

            <div className="space-y-2.5 pt-2">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  settings.negativeStockPolicy === "block_sale"
                    ? "bg-rose-50/50 border-rose-500"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="negativeStockPolicy"
                  checked={settings.negativeStockPolicy === "block_sale"}
                  onChange={() => setSettings({ ...settings, negativeStockPolicy: "block_sale" })}
                  className="mt-1 accent-rose-500"
                />
                <div>
                  <p className="text-xs font-black text-slate-900">Strictly Block Sale (Zero Stock)</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    Terminal will reject orders for items with zero or insufficient ingredients.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  settings.negativeStockPolicy === "allow_with_warning"
                    ? "bg-amber-50/50 border-amber-500"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="negativeStockPolicy"
                  checked={settings.negativeStockPolicy === "allow_with_warning"}
                  onChange={() => setSettings({ ...settings, negativeStockPolicy: "allow_with_warning" })}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <p className="text-xs font-black text-slate-900">Allow Sale with Warning</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    Shows cashier low-stock notice but allows placing order into negative ledger balance.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Smart Automation Toggles */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#ff5722]" />
            Stock Automation Toggles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Low Stock Alerts */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <p className="text-xs font-black text-slate-900">Low Stock Dashboard Alerts</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  Highlight ingredients that drop below reorder threshold in red.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.lowStockAlertEnabled}
                onChange={(e) => setSettings({ ...settings, lowStockAlertEnabled: e.target.checked })}
                className="w-5 h-5 accent-[#ff5722] cursor-pointer"
              />
            </div>

            {/* Auto Mark Out of Stock */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <p className="text-xs font-black text-slate-900">Auto-Mark Sold Out on QR Menu</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  Automatically grey out dishes when recipe raw materials are exhausted.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoOutOfStockEnabled}
                onChange={(e) => setSettings({ ...settings, autoOutOfStockEnabled: e.target.checked })}
                className="w-5 h-5 accent-[#ff5722] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 transition"
          >
            <span>View Live Stock Ledger</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-[#ff5722] hover:bg-[#ff7a47] disabled:bg-slate-300 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/20 transition flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save Stock Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
