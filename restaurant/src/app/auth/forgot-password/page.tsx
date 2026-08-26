import { getBackendUrl } from "@/config/api";
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const BACKEND_URL = getBackendUrl();

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setSuccess(data.message || "A password reset link has been sent to your email.");
      setEmail("");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-white flex font-sans overflow-hidden select-none relative">
      
      {/* Main card panel - Two Columns layout */}
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 relative z-10 animate-fade-in">
        
        {/* LEFT COLUMN: GORGEOUS CULINARY COVER PANEL */}
        <div className="col-span-12 lg:col-span-5 bg-[#edf4eb] relative overflow-hidden hidden lg:flex flex-col justify-between p-12 select-none h-full">
          <img 
            src="/auth_left_banner.png" 
            alt="RESTUVEXO Culinary Flat Lay Banner" 
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-102"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-orange-950/50 via-slate-950/20 to-slate-950/80 z-10" />

          {/* Logo Brand Header */}
          <div className="relative z-20 flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow-lg border border-slate-100/10 overflow-hidden">
              <img src="/restuvexo_logo.png" alt="RESTUVEXO Logo" className="w-full h-full object-cover p-1.5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-0.5">
                <span className="font-black text-lg tracking-tight text-white leading-none">RESTUVEXO</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] inline-block" />
              </div>
              <span className="text-[8px] font-black text-orange-200/90 uppercase tracking-widest block leading-none mt-0.5">Restaurant OS</span>
            </div>
          </div>

          {/* Core Info */}
          <div className="relative z-20 space-y-2.5 text-left border-t border-white/10 pt-6">
            <span className="px-2.5 py-1 bg-white/20 border border-white/10 text-white rounded-full text-[8px] font-black uppercase tracking-widest leading-none inline-block">Enterprise Safe</span>
            <h3 className="text-sm font-black text-white leading-tight">Secure Password Recovery</h3>
            <p className="text-[9.5px] text-orange-100/80 leading-relaxed font-semibold">Recover administrative access to your multi-tenant shop workspace with double-factor protection.</p>
          </div>
        </div>

        {/* RIGHT COLUMN: SECURE FORGOT FORM */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between p-8 sm:p-16 md:p-20 relative bg-white h-full overflow-y-auto">
          
          {/* Top navigation row */}
          <div className="flex justify-between items-center">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-450 hover:text-slate-800 uppercase tracking-wider transition"
            >
              <span>←</span>
              <span>Back to sign in</span>
            </Link>

            <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/15 text-[#ff5722] rounded-full text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-pulse" />
              Reset Request
            </span>
          </div>

          {/* Core Content Form Canvas */}
          <div className="space-y-6 my-auto py-8">
            
            {/* Header titles */}
            <div className="text-left space-y-1.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Forgot Password?</h1>
              <p className="text-slate-450 text-[10.5px] font-bold uppercase tracking-wider leading-relaxed">
                Enter your registered restaurant email address to receive a secure link to reset your password.
              </p>
            </div>

            {/* Error / Success alert components */}
            {error && (
              <div className="p-4.5 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-600 font-extrabold flex items-start gap-2.5 text-left animate-shake">
                <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-4.5 rounded-2xl bg-orange-50 border border-orange-100 text-xs text-orange-600 font-extrabold flex items-start gap-2.5 text-left">
                <svg className="w-4 h-4 text-[#ff5722] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Restaurant Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 select-none">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    placeholder="owner@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition duration-300 w-full font-semibold placeholder:text-slate-350"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black tracking-widest uppercase py-4.5 rounded-2xl shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? "Requesting Link..." : "Send Reset Link"}
              </button>

            </form>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[10px] text-slate-500 leading-relaxed text-center font-bold flex items-start gap-2">
              <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Sandbox Tip: If you are testing locally and haven't configured SMTP credentials inside `backend/.env`, you can copy the generated password reset link directly from your Node.js Terminal Console!</span>
            </div>

          </div>

          {/* Bottom Footer block */}
          <div className="border-t border-slate-100/80 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[10px] text-slate-400 font-bold text-center sm:text-left leading-relaxed max-w-sm flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Secure password recovery is protected under enterprise-grade cryptographic standard parameters.</span>
            </p>
            
            <div className="text-[11px] text-slate-500 shrink-0 font-bold">
              Remember password?{" "}
              <Link href="/auth/login" className="text-[#ff5722] hover:text-[#e04c1d] font-black">
                Sign In
              </Link>
            </div>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

    </div>
  );
}
