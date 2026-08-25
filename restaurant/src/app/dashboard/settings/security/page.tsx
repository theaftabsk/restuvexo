"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Lock,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Save,
  RotateCcw
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

export default function SecuritySettings() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // 1. Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2. Blocked Devices State
  const [blockedDevices, setBlockedDevices] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    deviceId: string | null;
    customerName: string;
  }>({
    show: false,
    deviceId: null,
    customerName: ""
  });

  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/blacklisted-devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        data.sort((a: any, b: any) => b.blockedAt - a.blockedAt);
        setBlockedDevices(data);
      }
    } catch (e) {
      console.error("Failed to load security data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      triggerToast("New passwords do not match.", "error");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      triggerToast("Password must be at least 6 characters.", "error");
      return;
    }

    setPasswordLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast("Password updated successfully! Keep your credentials safe.", "success");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        triggerToast(data.error || "Failed to update password.", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "Network error", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Unblock Device Execution
  const executeUnblock = async () => {
    const token = localStorage.getItem("authToken");
    const { deviceId } = confirmModal;
    setConfirmModal({ show: false, deviceId: null, customerName: "" });

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/blacklisted-devices/${deviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        triggerToast("Customer device has been unblocked successfully.", "success");
        setBlockedDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
      } else {
        triggerToast("Failed to unblock device.", "error");
      }
    } catch (e) {
      triggerToast("Failed to unblock device.", "error");
    }
  };

  if (loading) {
    return <LoadingScreen message="Securing restaurant network..." minHeight="50vh" />;
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

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-rose-500" />
          Security Console & Access Control
        </h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
          Manage Owner credentials, Manager override PINs, and Anti-Spam Firewall
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Change Owner Password */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Change Account Password</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Update your owner login credentials for this restaurant workspace
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-black uppercase tracking-widest rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Anti-Spam QR Customer Firewall */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Anti-Spam QR Order Firewall</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Blacklisted devices blocked from placing prank or fake QR self-orders
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase rounded-full">
              {blockedDevices.length} Blocked
            </span>
          </div>

          {blockedDevices.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Firewall is Active & Clean</h4>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  No suspicious or malicious devices are currently blacklisted on your restaurant network.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs bg-white">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Device Signature</th>
                    <th className="px-4 py-3">Customer Profile</th>
                    <th className="px-4 py-3">Block Reason</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {blockedDevices.map((device) => (
                    <tr key={device.deviceId} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 text-[11px]">
                        {device.deviceId.substring(0, 16)}...
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-900">{device.customerName || "Anonymous Diner"}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Smartphone className="w-3 h-3" />
                          {device.deviceInfo || "Mobile Device"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-black rounded-md border border-rose-100">
                          {device.reason || "Excessive Fake Orders"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            setConfirmModal({
                              show: true,
                              deviceId: device.deviceId,
                              customerName: device.customerName || "this device"
                            })
                          }
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-lg transition cursor-pointer"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unblock Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Unblock Customer Device?</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                This will allow <strong className="text-slate-700">{confirmModal.customerName}</strong> to place QR
                self-orders again from their phone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ show: false, deviceId: null, customerName: "" })}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeUnblock}
                className="py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-rose-500/20 transition"
              >
                Unblock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
