"use client";

import { useState } from "react";
import Link from "next/link";
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { getBackendUrl } from "@/config/api";

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
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Start 60s countdown when entering OTP stage
  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const BACKEND_URL = getBackendUrl();

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
      setTimeout(() => {
        setStage("otp");
        setError("");
        setSuccess("");
        startCountdown();
      }, 800);

    } catch (err: any) {
      setError(err.message || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError("");
    setSuccess("");

    const BACKEND_URL = getBackendUrl();

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not resend OTP.");
      }

      setSuccess("Fresh verification code sent! Check your inbox.");
      startCountdown();
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned && value !== "") return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (cleaned && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasteData) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < pasteData.length; i++) {
        newDigits[i] = pasteData[i];
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pasteData.length, 5);
      const targetInput = document.getElementById(`otp-digit-${focusIndex}`);
      if (targetInput) targetInput.focus();
    }
  };

  const handleOtpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const otpCode = otpDigits.join("");

    if (otpCode.length !== 6) {
      return setError("Please enter the complete 6-digit verification code.");
    }

    setLoading(true);
    const BACKEND_URL = getBackendUrl();

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

      setSuccess("Email successfully verified! Redirecting to setup...");
      
      // Save session credentials
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 1000);

    } catch (err: any) {
      setError(err.message || "Verification failed.");
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

          {/* Left Column Bottom Footer Badges */}
          <div className="relative z-20 flex items-center justify-between text-white/80 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold tracking-wider text-slate-200">Socket.io KDS Sync</span>
            </div>
            <div className="text-[10px] font-bold text-slate-300">
              v2.4 Enterprise Release
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE FORM CONTAINER */}
        <div className="col-span-12 lg:col-span-7 bg-white flex flex-col justify-between p-6 sm:p-12 lg:p-14 overflow-y-auto h-full text-slate-800">
          
          {/* Top Status Header */}
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-[#ff5722] uppercase bg-orange-50 px-3 py-1 rounded-full border border-orange-100/80">
                {stage === "input" ? "Step 1: Admin Account" : "Step 2: Email Verification"}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400">Need help? </span>
              <a href="mailto:support@restuvexo.shop" className="text-[11px] font-black text-[#ff5722] hover:underline">
                Contact Support
              </a>
            </div>
          </div>

          {/* Core Interaction Middle Block */}
          <div className="my-auto max-w-md w-full mx-auto py-6">
            
            {/* Header copy */}
            <div className="text-left mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
                {stage === "input" ? "Register Your Restaurant" : "Confirm OTP Code"}
              </h1>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                {stage === "input" 
                  ? "Launch your digital restaurant operating system in under 2 minutes."
                  : `Enter the 6-digit OTP sent to ${formData.email}`}
              </p>
            </div>

            {/* Error and Success Notifications */}
            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-fade-in text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Stage 1: Restaurant & Admin Details */}
            {stage === "input" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-left">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner / Manager Name</label>
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
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition duration-300 w-full font-semibold placeholder:text-slate-350"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Restaurant Business Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 select-none">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        name="restaurantName"
                        placeholder="The Royal Bistro"
                        value={formData.restaurantName}
                        onChange={handleChange}
                        className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition duration-300 w-full font-semibold placeholder:text-slate-350"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                    <div className="relative international-phone-wrapper">
                      <PhoneInput
                        defaultCountry="in"
                        value={formData.phone}
                        onChange={(phone) => setFormData({ ...formData, phone })}
                        inputClassName="!w-full !bg-slate-50 !border !border-slate-200 !text-slate-900 !text-xs !py-3 !h-[42px] !rounded-r-2xl focus:!outline-none focus:!border-[#ff5722] focus:!bg-white focus:!ring-4 focus:!ring-orange-500/10 !transition !duration-300 !font-semibold"
                        countrySelectorStyleProps={{
                          buttonClassName: "!bg-slate-50 !border !border-slate-200 !border-r-0 !rounded-l-2xl !h-[42px] !px-3 hover:!bg-slate-100 !transition !duration-300",
                          dropdownStyleProps: {
                            style: {
                              borderRadius: '16px',
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
              <form onSubmit={handleOtpVerifySubmit} className="space-y-6 text-left animate-fade-in">
                
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 bg-orange-50 border border-orange-200 text-[#ff5722] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Verify Your Email</h3>
                  <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto">
                    We sent a 6-digit code to <strong className="text-slate-800">{formData.email}</strong>
                  </p>
                </div>

                {/* 6 Digit Input Boxes */}
                <div className="flex justify-center items-center gap-2 sm:gap-3 py-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-digit-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoFocus={index === 0}
                      className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-black rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-[#ff5722] focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all shadow-sm"
                    />
                  ))}
                </div>

                {/* Resend Timer */}
                <div className="text-center">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="text-xs font-black text-[#ff5722] hover:text-[#e04c1d] transition underline underline-offset-4 active:scale-95"
                    >
                      {resending ? "Sending code..." : "Resend Verification Code"}
                    </button>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400">
                      Resend code in <strong className="text-slate-700 font-mono">{countdown}s</strong>
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStage("input")}
                    className="flex-1 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-2xl text-xs uppercase tracking-wider transition active:scale-95"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otpDigits.join("").length !== 6}
                    className="flex-[2] bg-[#ff5722] hover:bg-[#e04c1d] text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify & Continue →"}
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
