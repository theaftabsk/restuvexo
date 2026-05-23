"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "../layout";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  contacted: "bg-blue-100 text-blue-700 border-blue-200",
  scheduled: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_OPTIONS = ["pending", "contacted", "scheduled", "closed"];

function DemoCard({ req, passkey, BACKEND_URL, onUpdate, onDelete }) {
  const [status, setStatus] = useState(req.status || "pending");
  const [adminNote, setAdminNote] = useState(req.adminNote || "");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/demo-requests/${req.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-super-admin-key": passkey },
        body: JSON.stringify({ status, adminNote })
      });
      if (res.ok) onUpdate();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/demo-requests/${req.id}`, {
        method: "DELETE",
        headers: { "x-super-admin-key": passkey }
      });
      if (res.ok) onDelete(req.id);
    } finally { setDeleting(false); }
  };

  return (
    <div className={`bg-white border rounded-2xl shadow-sm transition-all ${expanded ? "border-orange-200 shadow-md" : "border-gray-200"}`}>
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 rounded-2xl"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Status Badge */}
        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border shrink-0 ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
          {status}
        </span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{req.restaurantName}</p>
          <div className="flex flex-wrap gap-x-4 text-[11px] text-gray-400 mt-0.5">
            <span>{req.name}</span>
            <span>{req.email}</span>
            <span>{req.phone}</span>
            <span>{new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          {req.message && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{req.message}</p>}
        </div>

        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-4">
          {/* Full Message */}
          {req.message && (
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Their Message</label>
              <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-200">{req.message}</p>
            </div>
          )}

          {/* Contact Buttons */}
          <div className="flex gap-2 flex-wrap">
            <a
              href={`tel:${req.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Call {req.phone}
            </a>
            <a
              href={`mailto:${req.email}`}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Email
            </a>
            <a
              href={`https://wa.me/91${req.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 transition"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.562 4.136 1.54 5.874L.057 23.893a.5.5 0 00.611.61l5.879-1.498A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.8-.534-5.373-1.461l-.386-.228-3.99 1.016 1.03-3.896-.247-.4A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              WhatsApp
            </a>
          </div>

          {/* Status & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Update Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Admin Note</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add internal note..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2 text-[10px] font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-xl transition cursor-pointer disabled:opacity-60"
            >
              {saving && <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemoRequestsPage() {
  const { passkey, BACKEND_URL } = useAdminAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [toast, setToast] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!passkey) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/demo-requests`, {
        headers: { "x-super-admin-key": passkey }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || []);
      }
    } finally { setLoading(false); }
  }, [passkey, BACKEND_URL]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleUpdate = () => {
    setToast("Updated!"); setTimeout(() => setToast(""), 2500);
    fetchRequests();
  };

  const handleDelete = (id) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    setToast("Deleted!"); setTimeout(() => setToast(""), 2500);
  };

  const FILTERS = ["All", ...STATUS_OPTIONS];
  const filtered = filter === "All" ? requests : requests.filter(r => r.status === filter);

  const counts = {};
  STATUS_OPTIONS.forEach(s => { counts[s] = requests.filter(r => r.status === s).length; });

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_OPTIONS.map(s => (
          <div key={s} className={`bg-white border rounded-xl p-3 border-gray-200 shadow-sm`}>
            <p className="text-lg font-bold text-gray-900">{counts[s] || 0}</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{s}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-[10px] font-semibold rounded-lg border transition cursor-pointer ${
              filter === f ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "All" ? `(${counts[f] || 0})` : `(${requests.length})`}
          </button>
        ))}
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm font-medium">No demo requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <DemoCard
              key={req.id}
              req={req}
              passkey={passkey}
              BACKEND_URL={BACKEND_URL}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
