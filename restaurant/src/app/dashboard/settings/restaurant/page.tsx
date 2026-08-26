import { getBackendUrl } from "@/config/api";
"use client";
import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function RestaurantSettings() {
  const BACKEND_URL = getBackendUrl();

  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);

  // Editable Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const triggerToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const loadRestaurant = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/restaurant`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load restaurant details from API.");
        const data = await res.json();
        setRestaurant(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setLogoUrl(data.logoUrl || "");
        localStorage.setItem("restaurant", JSON.stringify(data));
      } catch (err) {
        console.error(err);
        // Fallback to localStorage if offline or API fails
        const storedRest = localStorage.getItem("restaurant");
        if (storedRest) {
          const parsed = JSON.parse(storedRest);
          setRestaurant(parsed);
          setName(parsed.name || "");
          setPhone(parsed.phone || "");
          setAddress(parsed.address || "");
          setLogoUrl(parsed.logoUrl || "");
        }
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, []);

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const token = localStorage.getItem("authToken");
    
    const res = await fetch(`${BACKEND_URL}/api/upload?type=logo`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to upload image.");
    return data.data.url;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const uploadedUrl = await uploadImage(file);
      setLogoUrl(uploadedUrl);
      triggerToast("Logo uploaded successfully. Click Save to apply changes.", "success");
    } catch (err: any) {
      triggerToast(err.message || "Failed to upload logo.", "error");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      triggerToast("Restaurant Name is required.", "error");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/restaurant`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, address, logoUrl, phone })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update restaurant settings.");

      // Sync local storage
      const updatedRest = { ...restaurant, name, address, logoUrl, phone };
      localStorage.setItem("restaurant", JSON.stringify(updatedRest));
      setRestaurant(updatedRest);

      triggerToast("Restaurant settings updated successfully!", "success");
      setIsEditing(false);

      // Notify parent layouts to reload
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("restaurant_updated"));
    } catch (err: any) {
      triggerToast(err.message || "Failed to update settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(restaurant?.name || "");
    setPhone(restaurant?.phone || "");
    setAddress(restaurant?.address || "");
    setLogoUrl(restaurant?.logoUrl || "");
    setIsEditing(false);
  };

  const isOwner = user?.role === "owner";

  if (loading) {
    return <LoadingScreen message="Loading business details..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl text-slate-800 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up border ${
          toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-750" : "bg-slate-900 border-slate-700 text-white"
        }`}>
          <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-current animate-pulse" />
          <span className="text-[11px] font-black tracking-wide uppercase">{toast.msg}</span>
        </div>
      )}

      <div className="text-left">
        <h2 className="text-2xl font-black text-slate-900">Restaurant Info</h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Operating business details</p>
      </div>

      <div className="space-y-8">
        {/* Logo and Header Block */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 text-left">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-slate-600 shadow-md border border-slate-200 overflow-hidden relative">
              {logoUrl ? (
                <img src={logoUrl.startsWith("http") ? logoUrl : `${BACKEND_URL}${logoUrl}`} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {isEditing && isOwner && (
              <>
                <label htmlFor="logo-file-input" className="absolute -bottom-2 -right-2 bg-slate-900 hover:bg-[#ff5722] text-white p-2 rounded-xl shadow-lg border border-slate-700 cursor-pointer transition-all active:scale-90 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 012.17 0" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </label>
                <input type="file" id="logo-file-input" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </>
            )}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-2xl font-black text-slate-900 leading-tight">{restaurant?.name || "Loading..."}</h3>
          </div>
        </div>

        {/* Editable/Static Form Block */}
        <div className="space-y-6 text-left">
          {/* Restaurant Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Restaurant Name</label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. RESTUVEXO Indian Bistro"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#ff5722]/20 border border-slate-200 focus:border-[#ff5722] rounded-2xl text-sm font-bold text-slate-700 outline-none transition"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700">
                {restaurant?.name || "Not provided"}
              </div>
            )}
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Contact Phone</label>
            {isEditing ? (
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#ff5722]/20 border border-slate-200 focus:border-[#ff5722] rounded-2xl text-sm font-bold text-slate-700 outline-none transition"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700">
                {restaurant?.phone || "Not provided"}
              </div>
            )}
          </div>

          {/* Operating Address */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Operating Address</label>
            {isEditing ? (
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete restaurant operating address..."
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#ff5722]/20 border border-slate-200 focus:border-[#ff5722] rounded-2xl text-sm font-bold text-slate-700 outline-none transition resize-none"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 whitespace-pre-wrap">
                {restaurant?.address || "Not provided"}
              </div>
            )}
          </div>
        </div>

        {/* Buttons Controls */}
        <div className="pt-6 mt-4 border-t border-slate-100 flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3.5 bg-slate-900 hover:bg-[#ff5722] disabled:bg-slate-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition active:scale-95 shadow-md flex items-center gap-2 cursor-pointer"
              >
                {saving && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-[10px] font-black uppercase tracking-widest transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            isOwner && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3.5 bg-slate-900 hover:bg-[#ff5722] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-lg active:scale-95 cursor-pointer"
              >
                Edit Info
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
