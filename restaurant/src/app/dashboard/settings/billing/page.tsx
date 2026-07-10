"use client";

import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

interface Feature {
  code: string;
  name: string;
  enabled: boolean;
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

interface Invoice {
  id: number;
  invoiceNo: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
  paidAt: string;
  items: InvoiceItem[];
}

interface UsageMetric {
  metric: string;
  value: number;
}

interface SubscriptionStatus {
  planName: string;
  status: string;
  billingPeriod: string;
  startDate: string;
  endDate: string;
  trialStart?: string;
  trialEnd?: string;
  limits: {
    maxTables: number;
    maxStaff: number;
    maxKds: number;
  };
  features: Feature[];
  usage: UsageMetric[];
}

export default function BillingSettings() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedAddon, setSelectedAddon] = useState<string>("extra_tables");
  const [addonQty, setAddonQty] = useState<number>(1);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchBillingData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const [statusRes, invoicesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/subscription/status`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/subscription/invoices`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData);
      }
    } catch (e) {
      console.error("Failed to load subscription metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleBuyAddon = async () => {
    setPurchasing(true);
    setMessage(null);
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/purchase-addon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ addonCode: selectedAddon, quantity: addonQty })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Payment Successful! ${data.message}. Invoice: ${data.invoiceNo}`
        });
        await fetchBillingData();
      } else {
        throw new Error(data.error || "Failed to process payment.");
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to purchase addon." });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading billing console..." minHeight="50vh" />;
  }

  // Quota extraction helpers
  const findMetricValue = (metricCode: string) => {
    const metric = status?.usage?.find(u => u.metric === metricCode);
    return metric ? metric.value : 0;
  };

  const currentTables = findMetricValue("tables_count");
  const currentStaff = findMetricValue("staff_count");
  const currentKds = findMetricValue("kds_count");
  const currentOrders = findMetricValue("orders_count");

  const limitTables = status?.limits?.maxTables || 0;
  const limitStaff = status?.limits?.maxStaff || 0;
  const limitKds = status?.limits?.maxKds || 0;
  const limitOrders = status?.planName === "Starter" ? 30 : 99999;

  const ordersPercentage = Math.min(100, Math.round((currentOrders / limitOrders) * 100));
  const staffPercentage = Math.min(100, Math.round((currentStaff / limitStaff) * 100));
  const tablesPercentage = Math.min(100, Math.round((currentTables / limitTables) * 100));

  const isStarter = status?.planName === "Starter";

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-16 max-w-6xl mx-auto">
      
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 text-left">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Subscriptions</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit active modules, buy seat addons, and view invoice payments</p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 px-4.5 py-3 rounded-2xl flex items-center gap-3 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="text-left">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Active Subscription</p>
            <p className="text-xs font-black text-slate-800 uppercase mt-1">
              {status?.planName || "Trial Package"} Plan
            </p>
          </div>
        </div>
      </div>

      {/* Quota Progress Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        
        {/* Daily Orders Bar */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-xl shadow-slate-100/30">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Daily Orders Quota</p>
              <h4 className="text-2xl font-black text-slate-900 mt-1.5">{currentOrders} / {isStarter ? limitOrders : "Unlimited"}</h4>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${ordersPercentage >= 90 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
              {isStarter ? `${ordersPercentage}% Used` : "Uncapped"}
            </span>
          </div>
          {isStarter && (
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${ordersPercentage >= 90 ? "bg-rose-500" : ordersPercentage >= 75 ? "bg-amber-500" : "bg-emerald-500"}`} 
                style={{ width: `${ordersPercentage}%` }}
              />
            </div>
          )}
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-2.5">
            {isStarter ? "Warning: Starter limit caps at 30 orders/day." : "You have unlimited order operations on your active plan."}
          </p>
        </div>

        {/* Staff Seats Bar */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-xl shadow-slate-100/30">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Staff Terminals</p>
              <h4 className="text-2xl font-black text-slate-900 mt-1.5">{currentStaff} / {limitStaff}</h4>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${staffPercentage >= 95 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
              {staffPercentage}% Used
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${staffPercentage >= 95 ? "bg-rose-500" : staffPercentage >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} 
              style={{ width: `${staffPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-2.5">
            Increase staff limit by purchasing extra seats addon below.
          </p>
        </div>

        {/* Dining Tables Limit */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-xl shadow-slate-100/30">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Dining Tables</p>
              <h4 className="text-2xl font-black text-slate-900 mt-1.5">{currentTables} / {limitTables}</h4>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${tablesPercentage >= 95 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
              {tablesPercentage}% Used
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${tablesPercentage >= 95 ? "bg-rose-500" : tablesPercentage >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} 
              style={{ width: `${tablesPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-2.5">
            Add tables addon dynamically to accommodate expanding dining areas.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start text-left">
        
        {/* PhonePe Addon Marketplace Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-orange-600 text-white text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
              PhonePe PG Sandbox
            </div>
            
            <div className="space-y-2.5 pt-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">Addon Marketplace</span>
              <h3 className="text-lg font-black text-slate-900 mt-2">Buy Seat Addons</h3>
              <p className="text-slate-400 text-xs">Instantly increase staff capacity or alerts volume.</p>
            </div>

            {message && (
              <div className={`p-4 rounded-xl border text-[11px] font-semibold leading-normal ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Select Addon Category</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none"
                  value={selectedAddon}
                  onChange={(e) => setSelectedAddon(e.target.value)}
                >
                  <option value="extra_tables">Extra Dining Tables (₹100/each)</option>
                  <option value="extra_staff">Extra Staff Licenses (₹250/each)</option>
                  <option value="whatsapp_alerts">WhatsApp Messaging Engine (₹999 flat)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Addon Quantity</label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setAddonQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-xs font-black text-slate-900">{addonQty}</span>
                  <button 
                    onClick={() => setAddonQty(q => q + 1)}
                    className="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={handleBuyAddon}
                disabled={purchasing}
                className="w-full py-3.5 px-4 font-black uppercase tracking-wider rounded-2xl text-[10px] transition-all bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-650 hover:to-orange-700 text-white shadow-lg shadow-orange-500/10 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {purchasing ? "Processing Checkouts..." : "Buy via PhonePe"}
              </button>
            </div>
          </div>
        </div>

        {/* Feature-Based Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-6">
            <div className="border-b border-slate-50 pb-4">
              <h3 className="text-lg font-black text-slate-900">Custom Module Matrix</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Real-time status of features configured by administration</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {status?.features?.map((feat) => {
                const isEnabled = feat.enabled !== false;
                return (
                  <div 
                    key={feat.code} 
                    className={`p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 ${
                      isEnabled 
                        ? "bg-emerald-50/20 border-emerald-100/80 shadow-sm shadow-emerald-500/5" 
                        : "bg-slate-50/50 border-slate-100 opacity-60"
                    }`}
                  >
                    {isEnabled ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                    )}
                    <div className="space-y-0.5">
                      <p className={`text-xs font-black tracking-tight ${isEnabled ? "text-slate-900" : "text-slate-500"}`}>
                        {feat.name}
                      </p>
                      <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1.5 ${
                        isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        {isEnabled ? "ACTIVE" : "LOCKED"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Modern Invoices history ledgers */}
      <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-100/40 space-y-6 text-left">
        <div>
          <h3 className="text-lg font-black text-slate-900">Billing History</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Ledger of past invoice payments generated on checkout</p>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No billing records or invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <th className="pb-3.5">Invoice No</th>
                  <th className="pb-3.5">Description</th>
                  <th className="pb-3.5">Amount</th>
                  <th className="pb-3.5">Tax (18%)</th>
                  <th className="pb-3.5">Grand Total</th>
                  <th className="pb-3.5">Status</th>
                  <th className="pb-3.5">Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-black text-slate-900">{inv.invoiceNo}</td>
                    <td className="py-4 text-slate-650 font-semibold">{inv.items?.[0]?.description || "SaaS Custom Package"}</td>
                    <td className="py-4 font-semibold text-slate-700">₹{Number(inv.subtotal).toLocaleString('en-IN')}</td>
                    <td className="py-4 font-semibold text-slate-500">₹{Number(inv.tax).toLocaleString('en-IN')}</td>
                    <td className="py-4 font-black text-slate-900">₹{Number(inv.total).toLocaleString('en-IN')}</td>
                    <td className="py-4">
                      <span className="text-[8.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 text-slate-400 font-semibold">{new Date(inv.paidAt || inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
