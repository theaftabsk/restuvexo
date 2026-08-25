"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// ─────────────────────────────────────────────
// Auth Context
// ─────────────────────────────────────────────
export const AdminAuthContext = createContext({
  passkey: "",
  isAuthorized: false,
  setAuth: () => {},
  logout: () => {},
  BACKEND_URL: ""
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

// ─────────────────────────────────────────────
// Passkey Login Screen
// ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passkey.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/super-admin/stats`, {
        headers: { "x-super-admin-key": passkey }
      });
      if (res.ok) {
        sessionStorage.setItem("sa_key", passkey);
        onLogin(passkey);
      } else {
        setError("Invalid passkey. Access denied.");
      }
    } catch {
      setError("Cannot reach backend server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-lg text-center">
        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">RESTUVEXO Admin</h1>
        <p className="text-xs text-gray-500 mb-6">Secure super-admin access only</p>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Passkey</label>
            <input
              type="password"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Enter admin passkey..."
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-xl transition cursor-pointer disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sidebar Navigation
// ─────────────────────────────────────────────
const NAV = [
  {
    href: "/super-admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    href: "/super-admin/restaurants",
    label: "Restaurants",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    href: "/super-admin/subscriptions",
    label: "SaaS Subscriptions",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )
  },
  {
    href: "/super-admin/demo-requests",
    label: "Demo Requests",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  },
  {
    href: "/super-admin/settings",
    label: "System Settings",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

// ─────────────────────────────────────────────
// Main Layout
// ─────────────────────────────────────────────
export default function SuperAdminLayout({ children }) {
  const [passkey, setPasskey] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // If visiting /super-admin root (login page), don't show the layout shell
  const isLoginPage = pathname === "/super-admin";

  // Restore session from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("sa_key");
      if (stored) {
        // Quick verify
        fetch(`${BACKEND_URL}/api/super-admin/stats`, {
          headers: { "x-super-admin-key": stored }
        }).then(r => {
          if (r.ok) {
            setPasskey(stored);
            setIsAuthorized(true);
            // If sitting on login page and already authed, redirect to dashboard
            if (pathname === "/super-admin") {
              router.replace("/super-admin/dashboard");
            }
          } else {
            sessionStorage.removeItem("sa_key");
          }
        }).catch(() => {}).finally(() => setCheckingAuth(false));
      } else {
        setCheckingAuth(false);
        if (!isLoginPage) {
          router.replace("/super-admin");
        }
      }
    }
  }, []);

  const handleLogin = (key) => {
    setPasskey(key);
    setIsAuthorized(true);
    router.push("/super-admin/dashboard");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("sa_key");
    setPasskey("");
    setIsAuthorized(false);
    router.push("/super-admin");
  };

  // Login page
  if (isLoginPage && !isAuthorized) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xs text-gray-400 font-medium">Authenticating...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const activeHref = NAV.find(n => pathname.startsWith(n.href))?.href || "";
  const activeLabel = NAV.find(n => pathname.startsWith(n.href))?.label || "Admin";

  return (
    <AdminAuthContext.Provider value={{ passkey, isAuthorized, logout: handleLogout, BACKEND_URL }}>
      <div className="min-h-screen flex bg-gray-50 font-sans text-gray-800">

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed top-0 left-0 h-full z-40 w-56 bg-white border-r border-gray-200 flex flex-col
          transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:flex
        `}>
          {/* Brand */}
          <div className="px-4 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-none">RESTUVEXO</p>
                <p className="text-[9px] text-orange-500 font-semibold uppercase tracking-wider mt-0.5">Super Admin</p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-orange-50 text-orange-600 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className={isActive ? "text-orange-500" : "text-gray-400"}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 gap-4 shrink-0 sticky top-0 z-20">
            <button
              className="md:hidden text-gray-500 hover:text-gray-900 transition"
              onClick={() => setMobileOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900">{activeLabel}</h2>
              <p className="text-[10px] text-gray-400">admin.restuvexo.shop</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-gray-500 font-medium hidden sm:block">System Online</span>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthContext.Provider>
  );
}
