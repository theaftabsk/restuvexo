"use client";

import React, { useState, useEffect } from "react";

/**
 * Premium RESTUVEXO Unified Loading Screen Component
 * 
 * @param {string} message - Custom text to display during load (no emojis)
 * @param {string} minHeight - CSS min-height to apply for inline container layouts
 * @param {boolean} fullScreen - Renders as a full viewport glassmorphic overlay
 */
export default function LoadingScreen({ message = "Connecting to Restuvexo Engine...", minHeight = "50vh", fullScreen = true }) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 500); // 500ms delay to prevent flashing unless server is slow
    return () => clearTimeout(timer);
  }, []);

  const containerClass = fullScreen 
    ? "fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center min-h-screen w-screen" 
    : `flex flex-col items-center justify-center w-full py-12 rounded-[2rem] bg-white/60 backdrop-blur-sm border border-slate-100/50 shadow-sm`;

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={containerClass} style={!fullScreen && minHeight ? { minHeight } : undefined}>
      {/* Local keyframes injected for dashboard loading screen */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drawLeftCircle {
          0% { stroke-dasharray: 130; stroke-dashoffset: 130; }
          100% { stroke-dasharray: 130; stroke-dashoffset: 0; }
        }
        @keyframes drawRightCircle {
          0% { stroke-dasharray: 130; stroke-dashoffset: 130; }
          100% { stroke-dasharray: 130; stroke-dashoffset: 0; }
        }
        @keyframes drawOverlay {
          0% { stroke-dasharray: 30; stroke-dashoffset: 30; }
          40% { stroke-dasharray: 30; stroke-dashoffset: 30; }
          100% { stroke-dasharray: 30; stroke-dashoffset: 0; }
        }
        @keyframes textFadeInUp {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 0.95; transform: translateY(0); }
        }
        @keyframes gentleRotatePulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(3deg); }
        }
        @keyframes pulseLine {
          0%, 100% { width: 0; opacity: 0; }
          50% { width: 60px; opacity: 0.25; }
        }
        .animate-draw-left {
          animation: drawLeftCircle 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-draw-right {
          animation: drawRightCircle 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
        }
        .animate-draw-overlay {
          animation: drawOverlay 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-text-fade-in-up {
          animation: textFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-gentle-rotate-pulse {
          animation: gentleRotatePulse 3s ease-in-out infinite;
        }
        .animate-pulse-line {
          animation: pulseLine 1.8s ease-in-out infinite;
        }
      `}} />

      <div className="relative flex flex-col items-center justify-center space-y-4">
        
        {/* Glow behind the logo */}
        <div className="absolute w-32 h-32 bg-[#ff5a5f]/5 rounded-full filter blur-xl animate-pulse" />

        {/* Logo Image */}
        <div className="opacity-0 animate-text-fade-in-up flex items-center justify-center mb-0.5" style={{ animationDelay: '0.1s' }}>
          <img 
            src="/restuvexo_logo.png" 
            alt="RESTUVEXO Logo" 
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
          />
        </div>

        {/* Sleek inline logo spelling: RESTUVEX [interlocking loops O] */}
        <div className="flex items-center justify-center relative z-10">
          {/* RESTUVEX text */}
          <span className="text-slate-700 font-semibold tracking-wider text-xl sm:text-2xl md:text-3xl select-none opacity-0 animate-text-fade-in-up" style={{ animationDelay: '0.2s' }}>
            RESTUVEX
          </span>
          
          {/* Interlocking loops O */}
          <div className="relative w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center ml-0.5 select-none animate-gentle-rotate-pulse" style={{ animationDelay: '0.4s' }}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              {/* Left Circle Loop */}
              <circle 
                cx="38" 
                cy="50" 
                r="20" 
                fill="none" 
                stroke="#ff5a5f" 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeDasharray="130"
                strokeDashoffset="130"
                className="animate-draw-left"
              />
              {/* Right Circle Loop */}
              <circle 
                cx="62" 
                cy="50" 
                r="20" 
                fill="none" 
                stroke="#ff8e9b" 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeDasharray="130"
                strokeDashoffset="130"
                className="animate-draw-right"
              />
              {/* Interlocking overlay arc to make it look truly 3D/interlocked */}
              <path 
                d="M 38 30 A 20 20 0 0 1 55.32 40" 
                fill="none" 
                stroke="#ff5a5f" 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeDasharray="30"
                strokeDashoffset="30"
                className="animate-draw-overlay"
              />
            </svg>
          </div>
        </div>

        {/* Status Text Block */}
        <div className="text-center space-y-1.5 z-10 px-4">
          <p className="animate-text-fade-in-up text-[10px] font-black uppercase tracking-widest block max-w-xs md:max-w-md mx-auto text-[#ff5a5f]" style={{ animationDelay: '0.5s' }}>
            {message}
          </p>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#ff5a5f]/40 to-transparent mx-auto rounded-full animate-pulse-line" />
        </div>
      </div>
    </div>
  );
}
