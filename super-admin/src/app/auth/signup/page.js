"use client";

import { useState } from "react";
import Link from "next/link";
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

export default function OwnerSignup() {
  const [formData, setFormData] = useState({
    name: "",
    restaurantName: "",
    phone: "",
    email: "",
    password: ""
  });
  
  // Stages: 'input' (details form) -> 'otp' (OTP card)
  const [stage, setStage] = useState("input");
  const [otpCode, setOtpCode] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop");

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/owner/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signup request failed. Check details.");
      }

      setSuccess("Verification OTP sent successfully! Check your email inbox.");
      // Transition to OTP verification stage
      setTimeout(() => {
        setStage("otp");
        setError("");
        setSuccess("");
      }, 1000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerifySubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop");

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.email,
          otp: otpCode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "OTP verification failed. Check code.");
      }

      setSuccess("Email successfully verified! Creating restaurant ecosystem...");
      
      // Save all session tokens and full permission variables inside localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);

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

        {/* RIGHT COLUMN: PROFESSIONAL SECURE SIGNUP FORM */}
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
              Secure Register 256-Bit
            </span>
          </div>

          {/* Core Content Form Canvas */}
          <div className="space-y-6 my-auto py-8">
            
            {/* Header titles */}
            <div className="text-left space-y-1.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {stage === "input" ? "Register Restaurant" : "Verify Email Address"}
              </h1>
              <p className="text-slate-450 text-[10.5px] font-bold uppercase tracking-wider leading-relaxed">
                {stage === "input" 
                  ? "Launch your dynamic, multi-tenant POS operating system in seconds" 
                  : `Enter the 6-digit security OTP code sent to: ${formData.email}`}
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

            {/* Stage 1: Input details */}
            {stage === "input" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Restaurant Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 select-none">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      name="restaurantName"
                      placeholder="Enter restaurant name"
                      value={formData.restaurantName}
                      onChange={handleChange}
                      className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition duration-300 w-full font-semibold placeholder:text-slate-350"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 select-none">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter owner full name"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition duration-300 w-full font-semibold placeholder:text-slate-350"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                    <div className="w-full relative phone-input-container">
                      <PhoneInput
                        defaultCountry="in"
                        value={formData.phone}
                        onChange={(phone) => setFormData(prev => ({ ...prev, phone }))}
                        placeholder="Enter phone number"
                        className="w-full text-xs"
                        inputClassName="!w-full !text-xs !bg-slate-50 hover:!bg-slate-100/80 !border-slate-200 focus:!border-[#ff5722] focus:!bg-white focus:!ring-4 focus:!ring-orange-500/10 !rounded-r-2xl !h-[46px] !px-4 !font-semibold !text-slate-900 !transition-all !shadow-sm"
                        countrySelectorStyleProps={{
                          buttonClassName: "!bg-slate-50 hover:!bg-slate-100/80 !border-slate-200 !rounded-l-2xl !h-[46px] !px-3 !transition-all !shadow-sm !border-r-0",
                          dropdownStyleProps: {
                            style: {
                              borderRadius: '16px',
                              padding: '8px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                              marginTop: '8px',
                              fontFamily: 'inherit',
                              zIndex: 50
                            },
                            listItemClassName: "hover:!bg-slate-100 !rounded-xl !px-3 !py-2 !transition-colors !duration-200"
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
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
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition duration-300 w-full font-semibold placeholder:text-slate-350"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Account Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 select-none">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0 1.5 1.5M15.5 7.5 14 6" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      name="password"
                      placeholder="Enter a strong password"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition duration-300 w-full font-semibold placeholder:text-slate-350"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#ff5722] hover:bg-[#e04c1d] text-white text-xs font-black tracking-widest uppercase py-4.5 rounded-2xl shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] mt-4 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? "Sending OTP..." : "Get Email Verification OTP"}
                </button>

              </form>
            )}

            {/* Stage 2: OTP Verification */}
            {stage === "otp" && (
              <form onSubmit={handleOtpVerifySubmit} className="space-y-6 text-left">
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Enter 6-Digit Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full tracking-[12px] text-center text-3xl font-black py-4 border border-slate-200 rounded-3xl focus:outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-orange-500/10 bg-slate-50 text-slate-900 transition"
                    required
                  />
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[10px] text-slate-500 leading-relaxed text-center font-bold flex items-start gap-2">
                  <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>OTP Sandbox Tip: If you are testing locally and haven't configured SMTP credentials inside `backend/.env`, you can read the generated OTP code directly from your Node.js Terminal Console!</span>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStage("input")}
                    className="flex-1 py-4 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-2xl text-xs uppercase tracking-wider transition active:scale-95"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-[#ff5722] hover:bg-[#e04c1d] text-white font-extrabold py-4 rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    {loading ? "Creating Shop..." : "Verify & Create Shop"}
                  </button>
                </div>

              </form>
            )}

          </div>

          {/* Bottom Footer block */}
          <div className="border-t border-slate-100/80 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[10px] text-slate-400 font-bold text-center sm:text-left leading-relaxed max-w-sm flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>By registering, you agree to form a safe, secure RESTUVEXO multi-tenant environment subject to sandbox guidelines.</span>
            </p>
            
            <div className="text-[11px] text-slate-500 shrink-0 font-bold">
              Already registered?{" "}
              <Link href="/auth/login" className="text-[#ff5722] hover:text-[#e04c1d] font-black">
                Sign In
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
