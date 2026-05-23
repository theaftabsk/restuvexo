"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";

export default function StaffManagement() {
  const [user, setUser] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", role: "waiter", password: "" });
  const [formLoading, setFormLoading] = useState(false);

  // Edit form
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editData, setEditData] = useState({
    name: "", role: "waiter", password: "",
    hasPos: false, hasKitchen: false, hasOrders: false, hasInventory: false, hasStaff: false
  });
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [confirmModal, setConfirmModal] = useState({ show: false, staffId: null, staffName: "" });

  // New staff success modal (shows generated loginId)
  const [createdStaff, setCreatedStaff] = useState(null);
  const [copied, setCopied] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const triggerToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setStaffList(data);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── ADD STAFF ───────────────────────────────────────────────────────────────
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (formData.role !== "other" && formData.password.length < 4) {
      triggerToast("Password must be at least 4 characters.", "error");
      return;
    }
    setFormLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add staff.");
      setShowAddForm(false);
      setFormData({ name: "", role: "waiter", password: "" });
      setCreatedStaff(data.staff); // Show success modal with loginId
      fetchStaff();
    } catch (err) {
      triggerToast(err.message, "error");
    } finally {
      setFormLoading(false);
    }
  };

  // ─── EDIT STAFF ───────────────────────────────────────────────────────────────
  const openEditModal = (staff) => {
    setEditTarget(staff);
    setEditData({
      name: staff.name,
      role: staff.role,
      password: "",
      hasPos: staff.hasPos,
      hasKitchen: staff.hasKitchen,
      hasOrders: staff.hasOrders,
      hasInventory: staff.hasInventory,
      hasStaff: staff.hasStaff
    });
    setShowEditForm(true);
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    if (editData.password && editData.password.length < 4) {
      triggerToast("New password must be at least 4 characters.", "error");
      return;
    }
    setEditLoading(true);
    const token = localStorage.getItem("authToken");
    const payload = {
      name: editData.name,
      role: editData.role,
      hasPos: editData.hasPos,
      hasKitchen: editData.hasKitchen,
      hasOrders: editData.hasOrders,
      hasInventory: editData.hasInventory,
      hasStaff: editData.hasStaff
    };
    if (editData.password) payload.password = editData.password;

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/staff/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff.");
      triggerToast(`"${editData.name}" updated successfully!`, "success");
      setShowEditForm(false);
      fetchStaff();
    } catch (err) {
      triggerToast(err.message, "error");
    } finally {
      setEditLoading(false);
    }
  };

  // ─── DELETE STAFF ─────────────────────────────────────────────────────────────
  const executeDeleteStaff = async () => {
    const token = localStorage.getItem("authToken");
    const { staffId, staffName } = confirmModal;
    setConfirmModal({ show: false, staffId: null, staffName: "" });
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/staff/${staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete staff.");
      setStaffList(staffList.filter(s => s.id !== staffId));
      triggerToast(`"${staffName}" removed from database.`, "success");
    } catch (err) {
      triggerToast(err.message, "error");
    }
  };

  // ─── COPY loginId ─────────────────────────────────────────────────────────────
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingScreen message="Syncing staff database..." minHeight="50vh" />;

  if (user?.role !== "owner") {
    return (
      <div className="bg-white border border-rose-100 p-12 text-center rounded-[2.5rem] shadow-2xl max-w-xl mx-auto space-y-5 text-slate-800">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-rose-600">Access Restricted</h2>
        <Link href="/dashboard" className="inline-block bg-slate-900 text-white font-extrabold py-3 px-6 rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95">
          Return to Home
        </Link>
      </div>
    );
  }

  const PermissionToggle = ({ label, checked, onChange }) => (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition cursor-pointer ${
        checked
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-slate-50 border-slate-200 text-slate-400"
      }`}
    >
      <span>{label}</span>
      <span className={`w-8 h-4 rounded-full relative transition-colors ${checked ? "bg-emerald-500" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );

  return (
    <div className="space-y-8 relative text-slate-800 font-sans">

      {/* ─── TOAST ─── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-slide-up ${
          toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-900 border-slate-700 text-white"
        }`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0" />
          <span className="text-[11px] font-black tracking-wide uppercase">{toast.msg}</span>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Management Terminal</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            Onboard staff, assign roles, manage login credentials and permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-5 py-3 font-extrabold rounded-2xl text-[10px] uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-md transition whitespace-nowrap active:scale-95 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Onboard New Staff
        </button>
      </div>

      {/* ─── ADD STAFF MODAL ─── */}
      {showAddForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl relative border border-slate-100 text-slate-800 animate-slide-up">
            <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="mb-6">
              <h3 className="font-black text-slate-900 text-xl">Onboard New Staff</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                A unique 10-digit Login ID will be auto-generated
              </p>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input
                    type="text" placeholder="e.g. Ramesh Kumar" value={formData.name} required
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none transition"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Role Type</label>
                  <select
                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-2xl text-slate-800 text-xs font-black focus:outline-none transition cursor-pointer"
                  >
                    <option value="waiter">Waiter (Dine-in Terminal)</option>
                    <option value="kitchen">KOT Staff (Kitchen / KDS)</option>
                    <option value="other">Other Staff (No Login)</option>
                  </select>
                </div>
              </div>

              {formData.role !== "other" && (
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Login Password</label>
                  <input
                    type="password" placeholder="Min. 4 characters — staff will use this to login"
                    value={formData.password} required
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none transition"
                  />
                </div>
              )}

              {/* Info box */}
              {formData.role !== "other" && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3">
                  <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
                    A unique 10-digit Login ID will be generated automatically. Give this ID + the password to your staff member so they can login.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold rounded-2xl text-[10px] uppercase tracking-wider transition active:scale-95">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-4 rounded-2xl text-[10px] uppercase tracking-wider transition disabled:opacity-50 active:scale-95 shadow-md">
                  {formLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── SUCCESS MODAL: show generated loginId ─── */}
      {createdStaff && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-slate-100 text-center animate-slide-up">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900">Staff Account Created!</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 mb-6">
              Share these credentials with <span className="text-slate-700">{createdStaff.name}</span>
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-left mb-6">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">10-Digit Login ID</p>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <span className="font-mono font-black text-slate-900 text-xl tracking-[0.2em]">{createdStaff.loginId}</span>
                  <button onClick={() => copyToClipboard(createdStaff.loginId)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${copied ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</p>
                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                  createdStaff.role === "waiter" ? "bg-blue-50 text-blue-600 border-blue-100"
                  : createdStaff.role === "kitchen" ? "bg-rose-50 text-rose-600 border-rose-100"
                  : "bg-purple-50 text-purple-600 border-purple-100"
                }`}>{createdStaff.role}</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                   Save this Login ID! Staff will use this 10-digit ID + their password to login. This ID cannot be regenerated.
                </p>
              </div>
            </div>

            <button onClick={() => { setCreatedStaff(null); setCopied(false); }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-4 rounded-2xl text-[10px] uppercase tracking-wider transition active:scale-95 shadow-md">
              Done — Close
            </button>
          </div>
        </div>
      )}

      {/* ─── EDIT STAFF MODAL ─── */}
      {showEditForm && editTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl relative border border-slate-100 text-slate-800 animate-slide-up max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowEditForm(false)} className="absolute top-6 right-6 w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="mb-6">
              <h3 className="font-black text-slate-900 text-xl">Edit Staff Account</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Login ID:</span>
                <span className="font-mono font-black text-slate-600 text-sm tracking-widest">{editTarget.loginId}</span>
              </div>
            </div>
            <form onSubmit={handleEditStaff} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input
                    type="text" value={editData.name} required
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none transition"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Role</label>
                  <select value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-2xl text-slate-800 text-xs font-black focus:outline-none transition cursor-pointer">
                    <option value="waiter">Waiter (Dine-in Terminal)</option>
                    <option value="kitchen">KOT Staff (Kitchen / KDS)</option>
                    <option value="other">Other Staff (No Login)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">New Password <span className="text-slate-300">(Leave blank to keep current)</span></label>
                <input
                  type="password" placeholder="Leave blank = password unchanged"
                  value={editData.password}
                  onChange={e => setEditData({ ...editData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none transition"
                />
              </div>

              {/* Permissions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 pb-1">Module Access Permissions</p>
                <PermissionToggle label="POS Billing" checked={editData.hasPos} onChange={() => setEditData(p => ({ ...p, hasPos: !p.hasPos }))} />
                <PermissionToggle label="Kitchen Display (KDS)" checked={editData.hasKitchen} onChange={() => setEditData(p => ({ ...p, hasKitchen: !p.hasKitchen }))} />
                <PermissionToggle label="Orders Manager" checked={editData.hasOrders} onChange={() => setEditData(p => ({ ...p, hasOrders: !p.hasOrders }))} />
                <PermissionToggle label="Inventory Access" checked={editData.hasInventory} onChange={() => setEditData(p => ({ ...p, hasInventory: !p.hasInventory }))} />
                <PermissionToggle label="Staff Management" checked={editData.hasStaff} onChange={() => setEditData(p => ({ ...p, hasStaff: !p.hasStaff }))} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditForm(false)}
                  className="py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold rounded-2xl text-[10px] uppercase tracking-wider transition active:scale-95">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-4 rounded-2xl text-[10px] uppercase tracking-wider transition disabled:opacity-50 active:scale-95 shadow-md">
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── STAFF TABLE ─── */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-100/40">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-950 text-base">Active Staff Directory</h3>
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[9px] font-black uppercase text-slate-500 tracking-wider">
            {staffList.length} Members
          </span>
        </div>

        {staffList.length === 0 ? (
          <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h4 className="font-black text-slate-900 text-sm">No staff registered</h4>
            <p className="text-slate-400 text-[10px] font-semibold">Onboard your first waiter or kitchen staff using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold text-slate-600 bg-white">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-5 pl-8">Name</th>
                  <th className="p-5">Login ID</th>
                  <th className="p-5">Role</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staffList.map(staff => (
                  <tr key={staff.id} className="hover:bg-slate-50/30 transition">
                    <td className="p-5 pl-8">
                      <p className="font-black text-slate-900 text-sm">{staff.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">ID #{staff.id}</p>
                    </td>
                    <td className="p-5">
                      {staff.role === "other" ? (
                        <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">No Login</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-700 tracking-widest text-xs">{staff.loginId}</span>
                          <button
                            onClick={() => copyToClipboard(staff.loginId)}
                            title="Copy Login ID"
                            className="p-1 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-5">
                      {staff.role === "waiter" ? (
                        <span className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">Waiter</span>
                      ) : staff.role === "kitchen" ? (
                        <span className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">KOT Staff</span>
                      ) : (
                        <span className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100">Other</span>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        staff.status === "active"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                          : "bg-rose-50 border-rose-100 text-rose-600"
                      }`}>
                        {staff.status === "active" ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="p-5 text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(staff)}
                          className="py-2 px-4 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200 text-[9px] font-black uppercase tracking-wider rounded-xl transition duration-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmModal({ show: true, staffId: staff.id, staffName: staff.name })}
                          className="py-2 px-4 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-100 text-[9px] font-black uppercase tracking-wider rounded-xl transition duration-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.2rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 text-center animate-slide-up">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900">Offboard Staff</h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed mt-3 mb-6">
              Permanently delete <strong>&ldquo;{confirmModal.staffName}&rdquo;</strong>? Their login credentials will be destroyed immediately.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmModal({ show: false, staffId: null, staffName: "" })}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95">
                Cancel
              </button>
              <button onClick={executeDeleteStaff}
                className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95 shadow-md">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
