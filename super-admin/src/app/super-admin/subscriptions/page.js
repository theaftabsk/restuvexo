"use client";

import { useState, useEffect } from "react";

export default function SuperAdminSubscriptionsPage() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop";

  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({ totalSubscribed: 0, mrr: 0, activeCount: 0, graceCount: 0, suspendedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState([]);

  // Modals state
  const [extendModal, setExtendModal] = useState(null); // { subId, restaurantName, days: 15, reason: '' }
  const [paymentModal, setPaymentModal] = useState(null); // { subId, restaurantName, amount: 999, method: 'Cash', txnId: '', notes: '' }
  const [planModal, setPlanModal] = useState(null); // { subId, restaurantName, currentPlanId, newPlanId, customPrice }
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, [filter, search]);

  const fetchSubscriptions = async () => {
    const passkey = localStorage.getItem("superAdminPasskey") || "VexoSecretSuperAdminPasskey2026";
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/subscription/admin/subscriptions?status=${filter}&search=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${passkey}` } }
      );
      if (res.ok) {
        const json = await res.json();
        setSubscriptions(json.data || []);
        setStats(json.stats || { totalSubscribed: 0, mrr: 0, activeCount: 0, graceCount: 0, suspendedCount: 0 });
      }
    } catch (e) {
      console.error("Failed to load admin subscriptions:", e);
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
    } catch (e) {}
  };

  // 1. Extend Subscription
  const handleExtend = async (e) => {
    e.preventDefault();
    const passkey = localStorage.getItem("superAdminPasskey") || "VexoSecretSuperAdminPasskey2026";
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/admin/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${passkey}` },
        body: JSON.stringify({
          subscriptionId: extendModal.subId,
          days: parseInt(extendModal.days) || 15,
          reason: extendModal.reason || "Manual extension by Super Admin"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Subscription extended successfully!");
        setExtendModal(null);
        fetchSubscriptions();
      } else {
        showToast(data.error || "Failed to extend subscription", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 2. Record Offline Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const passkey = localStorage.getItem("superAdminPasskey") || "VexoSecretSuperAdminPasskey2026";
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/admin/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${passkey}` },
        body: JSON.stringify({
          subscriptionId: paymentModal.subId,
          amount: parseFloat(paymentModal.amount) || 999,
          paymentMethod: paymentModal.method || "Cash",
          transactionId: paymentModal.txnId || `MANUAL_${Date.now()}`,
          notes: paymentModal.notes || "Recorded by Super Admin"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Manual payment recorded successfully!");
        setPaymentModal(null);
        fetchSubscriptions();
      } else {
        showToast(data.error || "Failed to record payment", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 3. Change Plan
  const handleChangePlan = async (e) => {
    e.preventDefault();
    const passkey = localStorage.getItem("superAdminPasskey") || "VexoSecretSuperAdminPasskey2026";
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/admin/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${passkey}` },
        body: JSON.stringify({
          subscriptionId: planModal.subId,
          newPlanId: parseInt(planModal.newPlanId),
          customRenewalPrice: planModal.customPrice ? parseFloat(planModal.customPrice) : undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Plan updated successfully!");
        setPlanModal(null);
        fetchSubscriptions();
      } else {
        showToast(data.error || "Failed to change plan", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 4. Suspend / Reactivate Toggle
  const handleToggleStatus = async (subId, currentStatus) => {
    const passkey = localStorage.getItem("superAdminPasskey") || "VexoSecretSuperAdminPasskey2026";
    const nextStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/admin/change-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${passkey}` },
        body: JSON.stringify({
          subscriptionId: subId,
          status: nextStatus,
          reason: `Admin manual override to ${nextStatus}`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Subscription status changed to ${nextStatus}`);
        fetchSubscriptions();
      } else {
        showToast(data.error || "Failed to update status", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 5. Trigger Daily Cron
  const handleRunCron = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/admin/run-cron`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Daily cron executed: ${data.processed?.movedToGrace || 0} moved to grace.`);
        fetchSubscriptions();
      }
    } catch (err) {
      showToast("Cron execution failed", "error");
    }
  };

  return (
    <div className="space-y-6 text-slate-800 font-sans pb-16 text-left">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-black uppercase tracking-wider border ${
            toast.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-900 border-slate-700 text-white"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SaaS Subscription Management</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Monitor recurring revenue, manage tenant grace periods, and audit SaaS payments
          </p>
        </div>

        <button
          onClick={handleRunCron}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2"
        >
          <span>Run Expiration Cron</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Recurring (MRR)</span>
          <p className="text-3xl font-black text-slate-900">₹{stats.mrr ? stats.mrr.toLocaleString("en-IN") : "0"}</p>
          <span className="text-[10px] font-bold text-emerald-600">Active monthly subscriptions</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Tenants</span>
          <p className="text-3xl font-black text-emerald-600">{stats.activeCount || 0}</p>
          <span className="text-[10px] font-bold text-slate-400">🟢 Fully paid & active</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Grace Period</span>
          <p className="text-3xl font-black text-amber-600">{stats.graceCount || 0}</p>
          <span className="text-[10px] font-bold text-amber-600">⏳ 7-day grace active</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Suspended Tenants</span>
          <p className="text-3xl font-black text-rose-600">{stats.suspendedCount || 0}</p>
          <span className="text-[10px] font-bold text-rose-600">🛑 Restricted from POS</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "ACTIVE", "GRACE", "SUSPENDED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                filter === st
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search restaurant..."
          className="w-full sm:w-64 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {/* Tenant Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Restaurant</th>
                <th className="py-3.5 px-4">Plan Tier</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Current Period End</th>
                <th className="py-3.5 px-4">Renewal Price</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No subscriptions match current criteria.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isSuspended = sub.status === "SUSPENDED";
                  const isGrace = sub.status === "GRACE";

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-4">
                        <strong className="text-slate-900 block font-bold text-sm">{sub.restaurant?.name}</strong>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {sub.restaurant?.email || "No email"} • {sub.restaurant?.phone || "No phone"}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                          {sub.plan?.name || "Growth"}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            sub.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isGrace
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          <span>{sub.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })
                          : "-"}
                      </td>

                      <td className="py-4 px-4 font-black text-slate-900 text-sm">
                        ₹{parseFloat(sub.renewalAmount || sub.plan?.price || 999).toFixed(0)}
                      </td>

                      <td className="py-4 px-4 text-right space-x-1.5">
                        <button
                          onClick={() =>
                            setExtendModal({
                              subId: sub.id,
                              restaurantName: sub.restaurant?.name,
                              days: 15,
                              reason: "Courtesy extension"
                            })
                          }
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                        >
                          Extend
                        </button>

                        <button
                          onClick={() =>
                            setPaymentModal({
                              subId: sub.id,
                              restaurantName: sub.restaurant?.name,
                              amount: sub.renewalAmount || 999,
                              method: "Cash",
                              txnId: "",
                              notes: "Admin offline receipt"
                            })
                          }
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                        >
                          Pay
                        </button>

                        <button
                          onClick={() =>
                            setPlanModal({
                              subId: sub.id,
                              restaurantName: sub.restaurant?.name,
                              newPlanId: sub.planId,
                              customPrice: sub.renewalAmount
                            })
                          }
                          className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-[#ff5722] rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                        >
                          Plan
                        </button>

                        <button
                          onClick={() => handleToggleStatus(sub.id, sub.status)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                            isSuspended
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-rose-50 hover:bg-rose-100 text-rose-700"
                          }`}
                        >
                          {isSuspended ? "Reactivate" : "Suspend"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extend Modal */}
      {extendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">Extend Subscription</h3>
            <p className="text-xs text-slate-500 font-semibold">{extendModal.restaurantName}</p>

            <form onSubmit={handleExtend} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Add Free Days</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={extendModal.days}
                  onChange={(e) => setExtendModal({ ...extendModal, days: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={extendModal.reason}
                  onChange={(e) => setExtendModal({ ...extendModal, reason: e.target.value })}
                  placeholder="e.g. Free trial extension"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtendModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-[#ff5722] text-white rounded-xl font-bold uppercase tracking-wider transition shadow-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">Record Offline Payment</h3>
            <p className="text-xs text-slate-500 font-semibold">{paymentModal.restaurantName}</p>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  value={paymentModal.amount}
                  onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Method</label>
                <select
                  value={paymentModal.method}
                  onChange={(e) => setPaymentModal({ ...paymentModal, method: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI Direct">UPI Direct</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Receipt / Txn ID</label>
                <input
                  type="text"
                  value={paymentModal.txnId}
                  onChange={(e) => setPaymentModal({ ...paymentModal, txnId: e.target.value })}
                  placeholder="e.g. UTR123456789"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider transition shadow-md"
                >
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">Change Plan & Price</h3>
            <p className="text-xs text-slate-500 font-semibold">{planModal.restaurantName}</p>

            <form onSubmit={handleChangePlan} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Select New Tier</label>
                <select
                  value={planModal.newPlanId}
                  onChange={(e) => setPlanModal({ ...planModal, newPlanId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} Tier (Standard ₹{p.price}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Custom Renewal Price Snapshot (₹)
                </label>
                <input
                  type="number"
                  value={planModal.customPrice}
                  onChange={(e) => setPlanModal({ ...planModal, customPrice: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlanModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-[#ff5722] text-white rounded-xl font-bold uppercase tracking-wider transition shadow-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
