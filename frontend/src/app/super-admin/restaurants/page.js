"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "../layout";

// ─── ALL Features from the actual system ─────────────────────────
const FEATURE_MODULES = [
  { key: "posBilling",       label: "POS Billing",        icon: "🧾", desc: "Order entry & billing" },
  { key: "qrOrdering",      label: "QR Ordering",         icon: "📷", desc: "Customer self-ordering" },
  { key: "kds",             label: "KDS Screen",           icon: "🍳", desc: "Kitchen display" },
  { key: "inventory",       label: "Inventory",            icon: "📦", desc: "Stock & recipe control" },
  { key: "vexoAI",          label: "VexoAI",              icon: "🤖", desc: "AI chatbot assistant" },
  { key: "whatsappAPI",     label: "WhatsApp",            icon: "💬", desc: "Automated alerts" },
  { key: "staffManagement", label: "Staff Terminals",     icon: "👥", desc: "Multi-login terminals" },
  { key: "multiBranch",     label: "Multi-Branch",        icon: "🏢", desc: "Branch management" },
  { key: "analytics",       label: "Reports & OPEX",      icon: "📊", desc: "Expense & P&L reports" },
  { key: "thermalPrinter",  label: "Thermal Print",       icon: "🖨️", desc: "ESC/POS receipts" },
];

const STATUS_FILTERS = ["All", "trial", "custom", "lifetime", "expired"];

const DEFAULT_FEATURES = {
  posBilling: true, qrOrdering: true, kds: true, inventory: true,
  vexoAI: true, whatsappAPI: true, staffManagement: true,
  multiBranch: true, analytics: true, thermalPrinter: true
};

function PlanBadge({ plan, status }) {
  if (status === "expired") return <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200">Suspended</span>;
  if (plan === "trial") return <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">Trial</span>;
  if (plan === "lifetime") return <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-violet-100 text-violet-700 border border-violet-200">Lifetime</span>;
  return <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">Custom</span>;
}

function RestaurantCard({ restaurant, passkey, BACKEND_URL, onUpdated, onDeleted }) {
  const owner = restaurant.users?.[0] || {};
  const s = restaurant.settings || {};

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("subscription");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Subscription state
  const [subPlan, setSubPlan] = useState(s.subscriptionPlan || "trial");
  const [subStatus, setSubStatus] = useState(s.subscriptionStatus || "active");
  const [trialEndsAt, setTrialEndsAt] = useState(s.trialEndsAt ? s.trialEndsAt.substring(0, 10) : "");
  const [customPrice, setCustomPrice] = useState(s.customPrice || 0);
  const [customNotes, setCustomNotes] = useState(s.customNotes || "");

  // Feature toggles
  const [features, setFeatures] = useState(s.enabledFeatures || DEFAULT_FEATURES);

  // Advanced settings
  const [vexoNormalLimit, setVexoNormalLimit] = useState(s.vexoAiNormalLimit ?? 15);
  const [vexoApiLimit, setVexoApiLimit] = useState(s.vexoAiApiLimit ?? 5);
  const [qrEnabled, setQrEnabled] = useState(s.qrOrderingEnabled !== false);
  const [vexoEnabled, setVexoEnabled] = useState(s.vexoAiEnabled !== false);

  useEffect(() => {
    const ns = restaurant.settings || {};
    setSubPlan(ns.subscriptionPlan || "trial");
    setSubStatus(ns.subscriptionStatus || "active");
    setTrialEndsAt(ns.trialEndsAt ? ns.trialEndsAt.substring(0, 10) : "");
    setCustomPrice(ns.customPrice || 0);
    setCustomNotes(ns.customNotes || "");
    setFeatures(ns.enabledFeatures || DEFAULT_FEATURES);
    setVexoNormalLimit(ns.vexoAiNormalLimit ?? 15);
    setVexoApiLimit(ns.vexoAiApiLimit ?? 5);
    setQrEnabled(ns.qrOrderingEnabled !== false);
    setVexoEnabled(ns.vexoAiEnabled !== false);
  }, [restaurant.settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/restaurants/${restaurant.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-super-admin-key": passkey },
        body: JSON.stringify({
          subscriptionPlan: subPlan,
          subscriptionStatus: subStatus,
          trialEndsAt: subPlan === "trial" && trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
          enabledFeatures: features,
          customPrice: parseFloat(customPrice),
          customNotes,
          qrOrderingEnabled: qrEnabled,
          vexoAiEnabled: vexoEnabled,
          vexoAiNormalLimit: parseInt(vexoNormalLimit),
          vexoAiApiLimit: parseInt(vexoApiLimit)
        })
      });
      if (res.ok) onUpdated();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 4000); return; }
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/restaurants/${restaurant.id}`, {
        method: "DELETE",
        headers: { "x-super-admin-key": passkey }
      });
      if (res.ok) onDeleted(restaurant.id);
    } finally { setDeleting(false); }
  };

  // Trial days left
  let trialInfo = null;
  if (s.subscriptionPlan === "trial" && s.trialEndsAt) {
    const diff = Math.ceil((new Date(s.trialEndsAt) - Date.now()) / 86400000);
    trialInfo = diff;
  }

  const TABS = [
    { id: "subscription", label: "Subscription" },
    { id: "features", label: "Features" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <div className={`bg-white border rounded-2xl shadow-sm transition-all ${expanded ? "border-orange-200 shadow-md" : "border-gray-200 hover:border-gray-300"}`}>

      {/* Row Header — click to expand */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 cursor-pointer rounded-2xl"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{restaurant.name}</p>
            <PlanBadge plan={subPlan} status={subStatus} />
            {trialInfo !== null && (
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${trialInfo <= 0 ? "bg-red-50 text-red-600 border-red-200" : trialInfo <= 2 ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                {trialInfo <= 0 ? "EXPIRED" : `${trialInfo}d left`}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 mt-1 text-[11px] text-gray-400">
            <span>{owner.name || "—"}</span>
            <span>{owner.loginId || "—"}</span>
            <span>{restaurant.phone}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-5 shrink-0 text-center">
          <div>
            <p className="text-xs font-bold text-gray-800">{restaurant._count?.orders ?? 0}</p>
            <p className="text-[9px] text-gray-400">Orders</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">
              {Object.values(features || {}).filter(Boolean).length}/{FEATURE_MODULES.length}
            </p>
            <p className="text-[9px] text-gray-400">Features ON</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">₹{Number(s.customPrice || 0).toLocaleString("en-IN")}</p>
            <p className="text-[9px] text-gray-400">/mo</p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-wide transition cursor-pointer border-b-2 -mb-[2px] ${
                  activeTab === tab.id ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">
            {/* ── SUBSCRIPTION TAB ── */}
            {activeTab === "subscription" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Plan</label>
                    <select value={subPlan} onChange={(e) => setSubPlan(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400">
                      <option value="trial">Trial</option>
                      <option value="custom">Custom</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                    <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400">
                      <option value="active">Active</option>
                      <option value="expired">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Trial Ends</label>
                    <input type="date" value={trialEndsAt} disabled={subPlan !== "trial"} onChange={(e) => setTrialEndsAt(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 disabled:opacity-40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Price ₹/mo</label>
                    <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400" />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "7-Day Trial", cls: "text-amber-700 border-amber-200 hover:bg-amber-50", action: () => { setSubPlan("trial"); setSubStatus("active"); setTrialEndsAt(new Date(Date.now()+7*86400000).toISOString().slice(0,10)); } },
                      { label: "14-Day Trial", cls: "text-amber-700 border-amber-200 hover:bg-amber-50", action: () => { setSubPlan("trial"); setSubStatus("active"); setTrialEndsAt(new Date(Date.now()+14*86400000).toISOString().slice(0,10)); } },
                      { label: "30-Day Trial", cls: "text-amber-700 border-amber-200 hover:bg-amber-50", action: () => { setSubPlan("trial"); setSubStatus("active"); setTrialEndsAt(new Date(Date.now()+30*86400000).toISOString().slice(0,10)); } },
                      { label: "Activate Custom", cls: "text-emerald-700 border-emerald-200 hover:bg-emerald-50", action: () => { setSubPlan("custom"); setSubStatus("active"); setTrialEndsAt(""); } },
                      { label: "Lifetime Access", cls: "text-violet-700 border-violet-200 hover:bg-violet-50", action: () => { setSubPlan("lifetime"); setSubStatus("active"); setTrialEndsAt(""); } },
                      { label: "Suspend Account", cls: "text-red-700 border-red-200 hover:bg-red-50", action: () => setSubStatus("expired") },
                    ].map((btn) => (
                      <button key={btn.label} onClick={btn.action}
                        className={`px-3 py-1.5 text-[10px] font-semibold border rounded-lg transition cursor-pointer ${btn.cls}`}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Admin Notes</label>
                  <textarea rows={2} value={customNotes} onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Notes about this client, deal terms, custom features..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 resize-none" />
                </div>
              </div>
            )}

            {/* ── FEATURES TAB ── */}
            {activeTab === "features" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Toggle modules available to this restaurant</p>
                  <div className="flex gap-2">
                    <button onClick={() => setFeatures(Object.fromEntries(FEATURE_MODULES.map(f => [f.key, true])))}
                      className="text-[10px] font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition cursor-pointer">
                      Enable All
                    </button>
                    <button onClick={() => setFeatures(Object.fromEntries(FEATURE_MODULES.map(f => [f.key, false])))}
                      className="text-[10px] font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition cursor-pointer">
                      Disable All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEATURE_MODULES.map((f) => {
                    const on = features[f.key] !== false;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFeatures(prev => ({ ...prev, [f.key]: !on }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          on ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <span className="text-lg leading-none">{f.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${on ? "text-emerald-800" : "text-gray-500"}`}>{f.label}</p>
                          <p className="text-[10px] text-gray-400">{f.desc}</p>
                        </div>
                        {/* Toggle pill */}
                        <div className={`w-9 h-5 rounded-full flex items-center px-0.5 shrink-0 transition-all ${on ? "bg-emerald-500" : "bg-gray-300"}`}>
                          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Feature summary */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-400">
                    {Object.values(features).filter(Boolean).length} of {FEATURE_MODULES.length} modules enabled
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(Object.values(features).filter(Boolean).length / FEATURE_MODULES.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ADVANCED TAB ── */}
            {activeTab === "advanced" && (
              <div className="space-y-4">
                {/* QR Ordering */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">QR Ordering (DB field)</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Direct `qrOrderingEnabled` DB column for legacy checks</p>
                    </div>
                    <button
                      onClick={() => setQrEnabled(p => !p)}
                      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-all cursor-pointer ${qrEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${qrEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

                {/* VexoAI */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">VexoAI (DB field)</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Direct `vexoAiEnabled` DB column for legacy checks</p>
                    </div>
                    <button
                      onClick={() => setVexoEnabled(p => !p)}
                      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-all cursor-pointer ${vexoEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${vexoEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Normal Msg Limit/day</label>
                      <input type="number" min={0} max={999} value={vexoNormalLimit} onChange={(e) => setVexoNormalLimit(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">API Calls Limit/day</label>
                      <input type="number" min={0} max={999} value={vexoApiLimit} onChange={(e) => setVexoApiLimit(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400" />
                    </div>
                  </div>
                </div>

                {/* Restaurant Info Read-only */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Restaurant Record</p>
                  {[
                    ["ID", `#${restaurant.id}`],
                    ["Name", restaurant.name],
                    ["Phone", restaurant.phone],
                    ["Email", restaurant.email],
                    ["Registered", new Date(restaurant.createdAt).toLocaleString("en-IN")],
                    ["Total Orders", restaurant._count?.orders ?? 0],
                    ["Total Staff", restaurant._count?.users ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-[11px] text-gray-400">{label}</span>
                      <span className="text-[11px] font-semibold text-gray-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save / Delete row */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <button onClick={handleDelete} disabled={deleting}
                className={`px-4 py-2 text-[10px] font-semibold border rounded-xl transition cursor-pointer ${confirmDelete ? "bg-red-600 text-white border-red-700" : "text-red-600 border-red-200 hover:bg-red-50"}`}>
                {deleting ? "Deleting..." : confirmDelete ? "⚠ Confirm Delete" : "Delete Restaurant"}
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-xl transition cursor-pointer disabled:opacity-60">
                {saving && <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function RestaurantsPage() {
  const { passkey, BACKEND_URL } = useAdminAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState("");

  const fetchRestaurants = useCallback(async () => {
    if (!passkey) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/restaurants`, {
        headers: { "x-super-admin-key": passkey }
      });
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data.data || []);
      }
    } finally { setLoading(false); }
  }, [passkey, BACKEND_URL]);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const handleUpdated = () => {
    setToast("✓ Saved!"); setTimeout(() => setToast(""), 3000);
    fetchRestaurants();
  };

  const handleDeleted = (id) => {
    setRestaurants(prev => prev.filter(r => r.id !== id));
    setToast("Restaurant deleted."); setTimeout(() => setToast(""), 3000);
  };

  const filtered = restaurants.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.name.toLowerCase().includes(q) ||
      (r.users?.[0]?.name || "").toLowerCase().includes(q) ||
      (r.users?.[0]?.loginId || "").toLowerCase().includes(q) ||
      r.phone.includes(q);
    const s = r.settings;
    const matchStatus =
      statusFilter === "All" ||
      (statusFilter === "expired" ? s?.subscriptionStatus === "expired" : s?.subscriptionPlan === statusFilter);
    return matchSearch && matchStatus;
  });

  // Counts per filter
  const counts = {};
  STATUS_FILTERS.forEach(f => {
    counts[f] = f === "All" ? restaurants.length :
      restaurants.filter(r => f === "expired" ? r.settings?.subscriptionStatus === "expired" : r.settings?.subscriptionPlan === f).length;
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <input type="text" placeholder="Search by name, owner, phone, email..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400" />
          <svg className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 text-[10px] font-semibold rounded-lg border transition cursor-pointer ${statusFilter === f ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
              {f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No restaurants found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} passkey={passkey} BACKEND_URL={BACKEND_URL}
              onUpdated={handleUpdated} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
