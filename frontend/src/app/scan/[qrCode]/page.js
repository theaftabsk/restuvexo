"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function QrScannerGateway() {
  const params = useParams();
  const router = useRouter();
  const qrCode = params.qrCode;
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!qrCode) return;

    let deviceId = localStorage.getItem("guestDeviceId");
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guestDeviceId", deviceId);
    }

    const generateSecureLink = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")}/api/orders/generate-templink`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrCode, deviceId })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid QR Code.");
        
        // Redirect to the newly generated 10-minute safe link
        router.replace(data.url);
      } catch (e) {
        setError(e.message);
      }
    };

    generateSecureLink();
  }, [qrCode, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center text-3xl">
          
        </div>
        <h2 className="text-xl font-black">Scan Failed</h2>
        <p className="text-xs text-slate-400 max-w-xs">{error}</p>
        <p className="text-[10px] text-slate-500 mt-4">Please request staff for assistance.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 text-center space-y-6 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] animate-pulse"></div>
      </div>
      
      <div className="relative z-10 w-24 h-24 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-4xl shadow-2xl">
        <span className="animate-bounce"></span>
        
        {/* Scanning laser animation overlay */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-[scan_1.5s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 space-y-2 max-w-sm">
        <h2 className="text-lg font-black tracking-widest uppercase text-emerald-400">Authenticating...</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Generating Secure 10-Minute Dining Session
        </p>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
