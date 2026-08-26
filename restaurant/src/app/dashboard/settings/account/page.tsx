"use client";

import { getBackendUrl } from "@/config/api";
import { useState, useEffect } from "react";

export default function AccountSettings() {
  const BACKEND_URL = getBackendUrl();

  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  
  // Edit Form State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const triggerToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setName(parsedUser.name || "");
    }
    
    const storedRest = localStorage.getItem("restaurant");
    if (storedRest) {
      const parsedRest = JSON.parse(storedRest);
      setRestaurant(parsedRest);
      setPhone(parsedRest.phone || "");
    }
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      triggerToast("Name is required.", "error");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");

      // Sync local storage
      const updatedUser = { ...user, name };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      if (data.restaurant) {
        localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
        setRestaurant(data.restaurant);
      }

      triggerToast("Profile details updated successfully!", "success");
      setIsEditing(false);

      // Trigger telemetry/view updates in parents
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("restaurant_updated"));
    } catch (err: any) {
      triggerToast(err.message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setPhone(restaurant?.phone || "");
    setIsEditing(false);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl text-slate-800 font-sans text-left">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up border ${
          toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-750" : "bg-slate-900 border-slate-700 text-white"
        }`}>
          <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-current animate-pulse" />
          <span className="text-[11px] font-black tracking-wide uppercase">{toast.msg}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black text-slate-900">Account Details</h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Manage your personal credentials</p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#ff5722]/20 border border-slate-200 focus:border-[#ff5722] rounded-2xl text-sm font-bold text-slate-700 outline-none transition"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700">
                {user?.name || "Loading..."}
              </div>
            )}
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Mobile Number</label>
            {isEditing ? (
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#ff5722]/20 border border-slate-200 focus:border-[#ff5722] rounded-2xl text-sm font-bold text-slate-700 outline-none transition"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700">
                {restaurant?.phone || "Not provided"}
              </div>
            )}
          </div>

          {/* System Role */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">System Role</label>
            <div className="px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm font-black text-emerald-600 uppercase tracking-widest">
              {user?.role || "Staff"}
            </div>
          </div>

          {/* Account Status */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Account Status</label>
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </div>
          </div>
        </div>
        
        {/* Buttons Controls */}
        <div className="pt-6 mt-4 border-t border-slate-100 flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-slate-900 hover:bg-[#ff5722] disabled:bg-slate-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                {saving && (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-[10px] font-black uppercase tracking-widest transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-slate-900 hover:bg-[#ff5722] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-lg active:scale-95 cursor-pointer"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
