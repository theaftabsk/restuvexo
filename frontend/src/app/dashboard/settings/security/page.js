"use client";
import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function SecuritySettings() {
  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
  const [blockedDevices, setBlockedDevices] = useState([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(true);
  const [toast, setToast] = useState(null);

  //  Premium Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    deviceId: null,
    customerName: ""
  });

  const triggerToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBlacklist = async () => {
    setLoadingBlacklist(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/blacklisted-devices`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        data.sort((a, b) => b.blockedAt - a.blockedAt);
        setBlockedDevices(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBlacklist(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const triggerUnblockConfirm = (deviceId, customerName) => {
    setConfirmModal({
      show: true,
      deviceId,
      customerName
    });
  };

  const executeUnblock = async () => {
    const token = localStorage.getItem("authToken");
    const { deviceId } = confirmModal;
    setConfirmModal({ show: false, deviceId: null, customerName: "" });

    try {
      const res = await fetch(`${BACKEND_URL}/api/tables/blacklisted-devices/${deviceId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        triggerToast("Device has been unblocked successfully.", "success");
        setBlockedDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      } else {
        throw new Error("Failed to unblock");
      }
    } catch (e) {
      triggerToast("Failed to unblock device.", "error");
    }
  };

  if (loadingBlacklist) {
    return <LoadingScreen message="Syncing anti-spam blacklist..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up border ${
          toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-750" : "bg-slate-900 border-slate-700 text-white"
        }`}>
          <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-current animate-pulse" />
          <span className="text-[11px] font-black tracking-wide uppercase">{toast.msg}</span>
        </div>
      )}

      <div className="text-left">
        <h2 className="text-2xl font-black text-rose-500 tracking-tight">Anti-Spam Firewall</h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Manage blacklisted customer devices</p>
      </div>
      
      <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-6 shadow-inner space-y-6">
        <div className="flex items-center justify-between text-left">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            Blocked Devices
            <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-full text-xs font-bold">
              {blockedDevices.length}
            </span>
          </h3>
        </div>

        {loadingBlacklist ? (
          <div className="flex justify-center p-12">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
          </div>
        ) : blockedDevices.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white rounded-3xl shadow-sm border border-slate-250">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900 leading-none">System is Secure</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">
                No devices are currently blacklisted on your network.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-bold text-slate-700 bg-white">
              <thead className="bg-slate-100/50 text-[9px] font-black uppercase text-slate-450 tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Device ID</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Block Reason</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                {blockedDevices.map(device => (
                  <tr key={device.deviceId} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-black text-slate-900 font-mono text-[10px]">
                      {device.deviceId.substring(0, 16)}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-slate-900 font-black">{device.customerName}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {device.deviceInfo}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-wide">
                        {device.reason}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">
                        {new Date(device.blockedAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => triggerUnblockConfirm(device.deviceId, device.customerName)}
                        className="py-1.5 px-4 bg-white hover:bg-emerald-50 text-emerald-650 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest rounded-xl transition shadow-sm"
                        title="Remove from Blacklist"
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

      {/*  PREMIUM CUSTOM CONFIRMATION OVERLAY MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[2.2rem] p-8 w-full max-w-sm shadow-2xl relative border border-slate-100 text-slate-800 animate-slide-up">
            
            {/* Outline Shield Icon */}
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-slate-900 text-center tracking-tight leading-none">
              Unblock Device
            </h3>
            
            <p className="text-slate-500 text-xs font-semibold text-center leading-relaxed mt-3.5 mb-6.5">
              Are you sure you want to unblock {confirmModal.customerName}&apos;s device and allow them to browse and place QR orders again?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, deviceId: null, customerName: "" })}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={executeUnblock}
                className="py-3.5 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition active:scale-95 shadow-md"
              >
                Allow Device
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
