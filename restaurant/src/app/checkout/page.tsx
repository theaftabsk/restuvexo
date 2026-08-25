"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  CreditCard,
  Building2,
  Phone,
  Mail,
  User,
  ExternalLink
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

// Declare global Cashfree object from SDK
declare global {
  interface Window {
    Cashfree?: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "Growth";

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const [selectedPlanName, setSelectedPlanName] = useState(initialPlan);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cashfreeLoaded, setCashfreeLoaded] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/subscription/plans`)
      .then((r) => r.json())
      .then((d) => {
        setPlans(d || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [BACKEND_URL]);

  const activePlan = plans.find((p) => p.name.toLowerCase() === selectedPlanName.toLowerCase()) || plans[1] || {
    name: "Growth",
    price: "999",
    firstMonthPrice: "1",
    billingDays: 30
  };

  const handlePayFirstMonth = async () => {
    setProcessing(true);
    setErrorMsg(null);
    const token = localStorage.getItem("authToken");

    if (!token) {
      router.push(`/auth/login?redirect=/checkout?plan=${activePlan.name}`);
      return;
    }

    try {
      // 1. Create Cashfree Order
      const res = await fetch(`${BACKEND_URL}/api/subscription/cashfree/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId: activePlan.id, isRenewal: false })
      });

      const orderData = await res.json();
      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to generate Cashfree payment order.");
      }

      if (orderData.isMock) {
        throw new Error("Payment gateway not configured. Contact support.");
      }

      // 2. Open Cashfree Checkout
      if (window.Cashfree && orderData.paymentSessionId) {
        const isLocalhost = typeof window !== "undefined" && window.location.hostname.includes("localhost");
        const cashfree = window.Cashfree({ mode: orderData.environment || "production" });

        const redirectTarget = isLocalhost ? "_self" : "_modal";

        const result = await cashfree.checkout({
          paymentSessionId: orderData.paymentSessionId,
          redirectTarget
        });

        if (result?.error) {
          throw new Error(result.error.message || "Payment was cancelled.");
        }

        if (redirectTarget === "_modal") {
          // 3. Verify Payment with Backend when in modal
          const verifyRes = await fetch(`${BACKEND_URL}/api/subscription/cashfree/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              orderId: orderData.orderId,
              planId: activePlan.id
            })
          });

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            setSuccessData(verifyData.subscription || { planName: activePlan.name });
          } else {
            throw new Error(verifyData.error || "Payment was not completed on Cashfree. Please try again.");
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during payment.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Securing checkout portal..." minHeight="60vh" />;
  }

  // Success Confirmation Screen
  if (successData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-2xl text-center space-y-6 animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center border-4 border-emerald-100 shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest">
              Payment Successful
            </span>
            <h1 className="text-2xl font-black text-slate-900">🎉 Subscription Activated!</h1>
            <p className="text-xs font-semibold text-slate-500">
              Welcome to RESTUVEXO. Your {successData.planName || activePlan.name} cloud license is active for 30 days.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-left space-y-2 font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-400">Plan:</span>
              <strong className="text-slate-900">{successData.planName || activePlan.name} Tier</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Initial Paid:</span>
              <strong className="text-emerald-600 font-black">₹1.00 via Cashfree</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Next Renewal:</span>
              <strong className="text-slate-900">₹{activePlan.price} / month</strong>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="w-full py-4 bg-slate-900 hover:bg-[#ff5722] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Go to Restaurant Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfd] text-slate-900 font-sans pb-20 selection:bg-[#ff5722] selection:text-white">
      {/* Load Official Cashfree JS SDK */}
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setCashfreeLoaded(true)}
      />

      {/* Top Navbar */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm p-1.5 flex items-center justify-center">
              <img src="/restuvexo_logo.png" alt="RESTUVEXO Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-slate-900">RESTUVEXO</span>
              <span className="block text-[8px] font-black text-[#ff5722] uppercase tracking-widest">
                Cashfree PG Checkout
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>
      </header>

      {/* Main Checkout Body */}
      <main className="max-w-5xl mx-auto px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Plan Select & Details */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Complete Your Subscription</h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                Start for ₹1 today via Cashfree Gateway. Transparent with zero hidden fees.
              </p>
            </div>

            {/* Plan Selector Radios */}
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                Choose Subscription Plan
              </label>

              <div className="grid grid-cols-3 gap-3">
                {plans.map((p) => {
                  const isSelected = p.name.toLowerCase() === selectedPlanName.toLowerCase();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanName(p.name)}
                      className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-[#ff5722] bg-orange-50/50 shadow-md ring-2 ring-orange-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 uppercase">{p.name}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#ff5722]" />}
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-black text-slate-900">₹{p.price}</span>
                        <span className="text-[10px] font-bold text-slate-400 block">/ 30 days</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Inclusions Checklist */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ff5722]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Included in {activePlan.name} Plan
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-650">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>High-speed POS Billing & KOT</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instant Thermal Receipt Print</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Kitchen Display System & Chimes</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>7-Day Billing Grace Period</span>
                </p>
              </div>
            </div>

            {/* Error Display */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-shake">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Right Column: Order Summary & Cashfree Button */}
          <div className="lg:col-span-5 text-left">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl space-y-6 sticky top-28">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ff5722]">Order Breakdown</span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">{activePlan.name} Cloud License</h2>
              </div>

              <div className="space-y-3 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Regular Plan Price:</span>
                  <span className="font-bold text-slate-900 line-through">₹{activePlan.price}.00</span>
                </div>

                <div className="flex justify-between text-emerald-600">
                  <span>First Month Launch Discount:</span>
                  <span className="font-bold">-₹{Number(activePlan.price) - 1}.00</span>
                </div>

                <div className="flex justify-between">
                  <span>Billing Validity Cycle:</span>
                  <span className="font-bold text-slate-900">30 Full Days</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span>Subsequent Monthly Renewal:</span>
                  <span className="font-black text-slate-900">₹{activePlan.price} / month</span>
                </div>
              </div>

              {/* Total Due Today */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Due Today</span>
                  <span className="text-3xl font-black text-white">₹1.00</span>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase border border-emerald-500/30">
                    ₹1 Promo Active
                  </span>
                </div>
              </div>

              {/* Cashfree Pay Button */}
              <button
                onClick={handlePayFirstMonth}
                disabled={processing}
                className="w-full py-4 bg-gradient-to-r from-[#ff5722] to-[#ff7a47] hover:opacity-95 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{processing ? "Connecting Cashfree..." : "Pay ₹1 via Cashfree"}</span>
              </button>

              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Instant Activation • UPI / Google Pay / Cards</span>
                </p>
                <p className="text-[9px] font-medium text-slate-400">
                  Secured by Cashfree Payments India Pvt. Ltd.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Opening checkout..." minHeight="80vh" />}>
      <CheckoutContent />
    </Suspense>
  );
}
