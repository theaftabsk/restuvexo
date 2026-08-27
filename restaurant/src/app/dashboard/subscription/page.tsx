"use client";

import { getBackendUrl } from "@/config/api";

import { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowUpRight,
  FileText,
  Clock,
  Check,
  ShieldAlert
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

declare global {
  interface Window {
    Cashfree?: any;
  }
}

export default function SubscriptionBillingPage() {
  const BACKEND_URL = getBackendUrl();

  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedInvoicePayment, setSelectedInvoicePayment] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [cashfreeLoaded, setCashfreeLoaded] = useState(false);

  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchSubscription();
    fetchPlans();

    // Check if redirected back with cf_order_id
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const cfOrderId = urlParams.get("cf_order_id") || urlParams.get("order_id");
      if (cfOrderId) {
        verifyOrderAfterPayment(cfOrderId);
        // Clean URL params without refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const verifyOrderAfterPayment = async (orderId: string, planId?: number) => {
    setPaymentLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const verifyRes = await fetch(`${BACKEND_URL}/api/subscription/cashfree/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          planId: planId || data?.subscription?.planId
        })
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        triggerToast("🎉 Payment verified! Subscription successfully activated for 30 days.", "success");
        setShowUpgradeModal(false);
        fetchSubscription();
      } else {
        triggerToast(verifyData.error || "Payment not completed or failed on Cashfree.", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "Payment verification check failed.", "error");
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchSubscription = async () => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/my-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load subscription:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/plans`);
      if (res.ok) {
        const json = await res.json();
        setPlans(json || []);
      }
    } catch (e) {
      console.error("Failed to load plans:", e);
    }
  };

  const handlePayRenewal = async (planId?: number, isRenewal: boolean = true) => {
    setPaymentLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      // 1. Create Cashfree Order
      const res = await fetch(`${BACKEND_URL}/api/subscription/cashfree/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId, isRenewal })
      });

      const orderData = await res.json();

      if (!orderData.success) {
        throw new Error(orderData.error || "Could not initiate Cashfree payment order.");
      }

      // 2. Trigger Cashfree Checkout with fallback loader
      if (orderData.paymentSessionId) {
        let CashfreeSDK = window.Cashfree;
        if (!CashfreeSDK) {
          await new Promise<void>((resolve, reject) => {
            if (window.Cashfree) {
              CashfreeSDK = window.Cashfree;
              return resolve();
            }
            const existingScript = document.querySelector('script[src*="cashfree.com"]');
            if (existingScript) {
              existingScript.addEventListener("load", () => {
                CashfreeSDK = window.Cashfree;
                resolve();
              });
              existingScript.addEventListener("error", () => reject(new Error("Cashfree SDK failed to load")));
            } else {
              const script = document.createElement("script");
              script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
              script.onload = () => {
                CashfreeSDK = window.Cashfree;
                resolve();
              };
              script.onerror = () => reject(new Error("Failed to load Cashfree payment gateway SDK."));
              document.body.appendChild(script);
            }
          });
        }

        const cashfree = CashfreeSDK({ mode: orderData.environment || "production" });

        // Redirect directly to Cashfree secure hosted checkout (no iframe whitelisting required)
        const result = await cashfree.checkout({
          paymentSessionId: orderData.paymentSessionId,
          redirectTarget: "_self"
        });

        if (result?.error) {
          triggerToast(result.error.message || "Payment was cancelled.", "error");
          setPaymentLoading(false);
          return;
        }
      } else {
        throw new Error(orderData.error || "No payment session returned from Cashfree.");
      }
    } catch (err: any) {
      triggerToast(err.message || "Payment process failed.", "error");
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading subscription & billing details..." minHeight="50vh" />;
  }

  const sub = data?.subscription;
  const isSuspended = sub?.status === "SUSPENDED";
  const isInGrace = sub?.status === "GRACE";

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto text-slate-800 font-sans pb-16 text-left">
      {/* Load Cashfree JS SDK */}
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setCashfreeLoaded(true)}
      />

      {/* Toast */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#ff5722]" />
            Subscription & SaaS Billing
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Manage your RESTUVEXO cloud plan, renewals, and Cashfree payment receipts
          </p>
        </div>

        <Link
          href="/dashboard/subscription/invoices"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm transition active:scale-95"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Tax Invoices</span>
        </Link>
      </div>

      {/* Status Warning Banners */}
      {isSuspended && (
        <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-900 animate-pulse">
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-black">Subscription Suspended</h3>
              <p className="text-xs font-semibold text-rose-700 mt-0.5">
                Your subscription payment is overdue. Pay ₹{sub?.renewalAmount || 999} via Cashfree to restore full POS and KDS access.
              </p>
            </div>
          </div>
          <button
            onClick={() => handlePayRenewal()}
            disabled={paymentLoading}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-600/20 transition whitespace-nowrap active:scale-95 cursor-pointer"
          >
            {paymentLoading ? "Processing..." : `Pay ₹${sub?.renewalAmount || 999} via Cashfree`}
          </button>
        </div>
      )}

      {isInGrace && !isSuspended && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-sm font-black">7-Day Grace Period Active</h3>
              <p className="text-xs font-semibold text-amber-700 mt-0.5">
                Please complete your monthly renewal before the grace period expires to prevent terminal disruption.
              </p>
            </div>
          </div>
          <button
            onClick={() => handlePayRenewal()}
            disabled={paymentLoading}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition whitespace-nowrap active:scale-95 cursor-pointer"
          >
            {paymentLoading ? "Processing..." : `Renew for ₹${sub?.renewalAmount || 999}`}
          </button>
        </div>
      )}

      {/* Main Active Subscription Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1 rounded-full bg-[#ff5722] text-white text-[10px] font-black uppercase tracking-widest shadow-md">
                {sub?.plan?.name || "Growth"} Plan
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  sub?.status === "ACTIVE"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : sub?.status === "GRACE"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{sub?.status || "ACTIVE"}</span>
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-black tracking-tight text-white">
                  ₹{sub?.renewalAmount ? Number(sub.renewalAmount).toFixed(0) : "999"}
                </span>
                <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">/ 30 Days</span>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-2">
                Current cycle paid: <strong className="text-white">₹{sub?.amount || "1.00"}</strong> (First Month Offer applied)
              </p>
            </div>

            {/* Validity Timeline */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Started On</span>
                <span className="font-bold text-slate-200 mt-1 block">
                  {sub?.startedAt ? new Date(sub.startedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valid Until</span>
                <span className="font-bold text-slate-200 mt-1 block">
                  {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "30 Days"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Days Left</span>
                <span className={`font-black text-sm mt-1 block ${sub?.daysRemaining <= 7 ? "text-amber-400" : "text-emerald-400"}`}>
                  {sub?.daysRemaining || 30} Days
                </span>
              </div>
            </div>
          </div>

          {/* Action Column */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between gap-4 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Due Amount</span>
              <p className="text-2xl font-black text-white">₹{sub?.renewalAmount || "999"}</p>
              <p className="text-[10px] font-medium text-slate-400">Cashfree Instant UPI / NetBanking</p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => handlePayRenewal()}
                disabled={paymentLoading}
                className="w-full py-3.5 bg-gradient-to-r from-[#ff5722] to-[#ff7a47] hover:opacity-90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                {paymentLoading ? "Connecting Cashfree..." : "Renew Subscription"}
              </button>

              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-wider rounded-2xl transition cursor-pointer"
              >
                Change Plan Tier
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden space-y-4 p-6 md:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">SaaS Payment History</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              All subscription transactions and receipts via Cashfree
            </p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">
            {sub?.payments?.length || 0} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Gateway</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Invoice / Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
              {!sub?.payments || sub.payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                    No payment history recorded yet.
                  </td>
                </tr>
              ) : (
                sub.payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {new Date(p.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      ₹{parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-600">{p.gateway || "Cashfree"}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500 text-[11px]">
                      {p.cfOrderId || p.transactionId || `TXN_${p.id}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{p.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoicePayment(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ff5722] border border-orange-200 text-[11px] font-black transition cursor-pointer shadow-xs active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Download Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade / Change Plan Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 w-full max-w-4xl shadow-2xl border border-slate-200 text-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Select Subscription Tier</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Upgrade or switch your RESTUVEXO cloud management tier via Cashfree
                </p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isCurrent = sub?.planId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition ${
                      isCurrent
                        ? "border-[#ff5722] bg-orange-50/40 shadow-md"
                        : "border-slate-200 hover:border-slate-400 bg-white"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-[#ff5722]">{p.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-[#ff5722] text-white text-[9px] font-black uppercase rounded-full">
                            Current
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900">₹{p.price}</span>
                          <span className="text-xs font-bold text-slate-400">/ 30 days</span>
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-600 mt-1">₹1 First Month Promo</p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                        <p className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Unlimited Walk-in POS Billing</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Kitchen KOT Real-time Dispatch</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>
                            {p.features?.maxTables ? `Up to ${p.features.maxTables} Tables` : "Unlimited Tables & QR"}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>
                            {p.features?.kds ? "Kitchen Display System (KDS)" : "Basic Order Queue"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePayRenewal(p.id, false)}
                      disabled={paymentLoading || isCurrent}
                      className={`w-full mt-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                        isCurrent
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-slate-900 hover:bg-[#ff5722] text-white shadow-md"
                      }`}
                    >
                      {isCurrent ? "Active Tier" : `Switch to ${p.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Printable / Downloadable Official Tax Invoice Receipt Modal */}
      {selectedInvoicePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl p-6 sm:p-10 w-full max-w-2xl shadow-2xl border border-slate-200 text-slate-800 space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-8">
            
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b-2 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center p-2 shadow-md">
                  <img src="/restuvexo_logo.png" alt="RESTUVEXO" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">RESTUVEXO INC.</h2>
                  <p className="text-[11px] font-bold text-slate-500">Restaurant Operating System & Cloud POS</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">GSTIN: 19AAACR9821F1Z8</p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Payment Receipt & Tax Invoice
                </span>
                <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                  INV-{selectedInvoicePayment.id.toString().padStart(6, '0')}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Date: {new Date(selectedInvoicePayment.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Billed To / Billed From Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Billed To (Customer):</span>
                <p className="font-black text-slate-900 text-sm">{data?.restaurant?.name || "Restaurant Partner"}</p>
                <p className="font-bold text-slate-600 mt-0.5">{data?.restaurant?.email || "owner@restuvexo.shop"}</p>
                <p className="font-semibold text-slate-500">{data?.restaurant?.phone || ""}</p>
                {data?.restaurant?.address && (
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">{data.restaurant.address}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Transaction Details:</span>
                <p className="font-bold text-slate-700">Payment Gateway: <strong className="text-slate-900">Cashfree PG</strong></p>
                <p className="font-mono text-[11px] text-slate-500 mt-0.5">Order ID: {selectedInvoicePayment.cfOrderId || selectedInvoicePayment.transactionId}</p>
                <p className="font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Status: PAID / SUCCESS
                </p>
              </div>
            </div>

            {/* Invoice Line Item Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Period</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3">
                    <p className="font-black text-slate-900">{sub?.plan?.name || "Growth"} Tier Subscription</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{selectedInvoicePayment.notes || "30 Days Cloud License"}</p>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-600">30 Days</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-600">1</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                    ₹{parseFloat(selectedInvoicePayment.amount).toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="py-2.5 px-3 font-bold text-slate-600 text-right">Subtotal:</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 text-right">₹{parseFloat(selectedInvoicePayment.amount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 px-3 font-bold text-slate-500 text-right">GST (18% Inclusive):</td>
                  <td className="py-1 px-3 font-bold text-slate-600 text-right">₹{(parseFloat(selectedInvoicePayment.amount) * 0.18 / 1.18).toFixed(2)}</td>
                </tr>
                <tr className="border-t border-slate-200 text-sm">
                  <td colSpan={3} className="py-3 px-3 font-black text-slate-900 text-right">Total Paid:</td>
                  <td className="py-3 px-3 font-black text-emerald-600 text-right text-base">₹{parseFloat(selectedInvoicePayment.amount).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Terms & Seal */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400">
              <p>This is a computer-generated tax invoice and requires no physical signature.</p>
              <div className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold">
                ✓ Verified by Cashfree PG
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedInvoicePayment(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ea580c] hover:from-[#e04c1d] hover:to-[#c83e14] text-white text-xs font-black transition shadow-lg shadow-orange-500/25 flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Print / Download PDF Receipt</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
