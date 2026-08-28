"use client";

import { useState } from "react";
import Link from "next/link";

export default function UnifiedLogin() {
  const [formData, setFormData] = useState({
    phoneOrEmail: "",
    credential: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Quick validation: PIN only accepts digits up to 4
    if (name === "credential" && /^\d+$/.test(value) && value.length <= 4) {
      setFormData({ ...formData, [name]: value });
      return;
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop");

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Check your credentials.");
      }

      setSuccess(`Authenticated successfully as ${data.user.role.toUpperCase()}! Entering Workspace...`);
      
      // Save session credentials
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        if (data.user.role === "waiter") {
          window.location.href = "/waiter";
        } else if (data.user.role === "kitchen") {
          window.location.href = "/kds";
        } else {
          window.location.href = "/dashboard";
        }
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop");
    const demoData = {
      phoneOrEmail: "demo@restuvexo.shop",
      credential: "password123"
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(demoData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Demo login failed.");
      }

      setSuccess("Authentic Owner Session active! Welcome back...");
      
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoWaiterLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop");
    const demoWaiterData = {
      phoneOrEmail: "01700000000",
      credential: "0000"
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(demoWaiterData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Demo Waiter login failed.");
      }

      setSuccess("Authentic Waiter Session active! Launching Mobile Terminal...");
      
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = "/waiter";
      }, 1200);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoKitchenLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop");
    const demoKitchenData = {
      phoneOrEmail: "01800000000",
      credential: "0000"
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(demoKitchenData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Demo Chef login failed.");
      }

      setSuccess("Authentic Chef Session active! Launching Kitchen Monitor...");
      
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = "/kds";
      }, 1200);

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
          {/* Custom herbal/warm overlay tint to match signature vermilion dashboard style */}
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

          {/* Floating dynamic reviews & specs */}
          <div className="relative z-20 space-y-4 max-w-xs mt-12 text-left">
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-lg border border-white/20 transform -rotate-1.5 hover:rotate-0 transition duration-300">
              <p className="text-[10px] font-black text-slate-800 leading-snug">"The fastest POS billing system we have ever integrated in our kitchen!"</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-[8px] font-black text-[#ff5722] uppercase tracking-wider">— Chef Raymond</p>
                <div className="flex gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-lg border border-white/20 transform rotate-1.5 hover:rotate-0 transition duration-300 ml-6">
              <p className="text-[10px] font-black text-slate-800 leading-snug">"Zero server polling load and dynamic customer themes look stunning."</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-[8px] font-black text-[#ff5722] uppercase tracking-wider">— Restro Operator</p>
                <div className="flex gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info details */}
          <div className="relative z-20 space-y-2.5 text-left border-t border-white/10 pt-6">
            <span className="px-2.5 py-1 bg-white/20 border border-white/10 text-white rounded-full text-[8px] font-black uppercase tracking-widest leading-none inline-block">Enterprise Safe</span>
            <h3 className="text-sm font-black text-white leading-tight">Next-Gen Multi-Tenant POS</h3>
            <p className="text-[9.5px] text-orange-100/80 leading-relaxed font-semibold">Join thousands of premier bistros, bars, and dark kitchens coordinating orders in real-time.</p>
          </div>
        </div>

        {/* RIGHT COLUMN: PROFESSIONAL SECURE LOGIN FORM */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between p-8 sm:p-16 md:p-20 relative bg-white h-full overflow-y-auto">
          
          {/* Top navigation row */}
          <div className="flex justify-between items-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-450 hover:text-slate-800 uppercase tracking-wider transition"
            >
              <span>←</span>
              <span>Back to home</span>
            </Link>

            <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/15 text-[#ff5722] rounded-full text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-pulse" />
              Secure Terminal 256-Bit
            </span>
          </div>

          {/* Core Content Form Canvas */}
          <div className="space-y-6 my-auto py-8">
            
            {/* Header titles */}
            <div className="text-left space-y-1.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to RESTUVEXO!</h1>
              <p className="text-slate-450 text-[10.5px] font-bold uppercase tracking-wider leading-relaxed">
                Log in to access your custom restaurant dashboard, waiter panel, or kitchen monitor.
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

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number or Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 select-none">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    name="phoneOrEmail"
                    placeholder="Enter email address or phone number"
                    value={formData.phoneOrEmail}
                    onChange={handleChange}
                    className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition duration-300 w-full font-semibold placeholder:text-slate-350"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password or 4-Digit PIN</label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-[9px] font-black text-[#ff5722] hover:text-[#e04c1d] uppercase tracking-wider transition"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 select-none">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    name="credential"
                    placeholder="Enter owner password or staff PIN"
                    value={formData.credential}
                    onChange={handleChange}
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
                {loading ? "Authenticating Session..." : "Verify & Enter Workspace"}
              </button>

            </form>

            <div className="border-t border-dashed border-slate-150 pt-5 space-y-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 text-left">
                <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                Sandbox Demo Bypass Sessions
              </span>
              
              <button
                onClick={handleQuickDemoLogin}
                disabled={loading}
                type="button"
                className="w-full py-3.5 border border-orange-200/80 bg-orange-50/10 hover:bg-orange-50 text-[#ff5722] font-extrabold rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5 text-[#ff5722]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
                  <path d="M5 20h14" />
                </svg>
                Launch Owner Workspace (Demo Owner)
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleQuickDemoWaiterLogin}
                  disabled={loading}
                  type="button"
                  className="py-3.5 border border-indigo-200/80 bg-indigo-50/10 hover:bg-indigo-50 text-indigo-700 font-extrabold rounded-2xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6" />
                    <path d="M22 11h-6" />
                  </svg>
                  Waiter Terminal
                </button>
                
                <button
                  onClick={handleQuickDemoKitchenLogin}
                  disabled={loading}
                  type="button"
                  className="py-3.5 border border-rose-200/80 bg-rose-50/10 hover:bg-rose-50 text-rose-700 font-extrabold rounded-2xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 18a4 4 0 0 1-1.156-7.836A5.5 5.5 0 0 1 12 4.5a5.5 5.5 0 0 1 7.156 5.664A4 4 0 0 1 18 18H6z" />
                    <path d="M6 18h12" />
                  </svg>
                  Kitchen Monitor
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Footer block */}
          <div className="border-t border-slate-100/80 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-[10px] text-slate-400 font-bold text-center sm:text-left leading-relaxed max-w-sm flex items-start gap-1.5">
              <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Quick Tip: Owners sign in with their Email. Waiters and Kitchen staff sign in with their Phone + 4-Digit PIN.</span>
            </div>
            
            <div className="text-[11px] text-slate-500 shrink-0 font-bold">
              New restaurant?{" "}
              <Link href="/auth/signup" className="text-[#ff5722] hover:text-[#e04c1d] font-black">
                Register Now
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* Global CSS keyframes inline injected */}
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
