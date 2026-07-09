"use client";

import { useState, useEffect } from "react";
import { useAdminAuth } from "../layout";

export default function SystemSettingsPage() {
  const { passkey, BACKEND_URL } = useAdminAuth();
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    setHealth(null);
    try {
      const start = Date.now();
      const res = await fetch(`${BACKEND_URL}/api/super-admin/stats`, {
        headers: { "x-super-admin-key": passkey }
      });
      const ping = Date.now() - start;
      if (res.ok) {
        setHealth({ ok: true, ping, status: res.status });
      } else {
        setHealth({ ok: false, ping, status: res.status });
      }
    } catch {
      setHealth({ ok: false, ping: null, error: "Cannot reach server" });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { checkHealth(); }, []);

  const maskedKey = passkey ? passkey.slice(0, 4) + "•".repeat(passkey.length - 4) : "—";

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Backend Health */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Backend Health</h3>
          <button
            onClick={checkHealth}
            disabled={checking}
            className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            {checking ? "Checking..." : "Re-Check"}
          </button>
        </div>

        {health ? (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${health.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <span className={`w-3 h-3 rounded-full shrink-0 ${health.ok ? "bg-emerald-500" : "bg-red-500"}`} />
            <div>
              <p className={`text-xs font-bold ${health.ok ? "text-emerald-800" : "text-red-800"}`}>
                {health.ok ? "✓ Backend Online" : "✗ Backend Offline"}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {health.ping !== null ? `Response: ${health.ping}ms` : health.error} · HTTP {health.status || "N/A"}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">Backend URL</span>
            <span className="text-xs font-mono font-semibold text-gray-700 truncate max-w-[200px]">{BACKEND_URL}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">Admin Domain</span>
            <span className="text-xs font-semibold text-gray-700">admin.restuvexo.shop</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-500">App Domain</span>
            <span className="text-xs font-semibold text-gray-700">app.restuvexo.shop</span>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Session</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">Admin Passkey</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-gray-700">
                {showKey ? passkey : maskedKey}
              </span>
              <button
                onClick={() => setShowKey(p => !p)}
                className="text-[10px] text-gray-400 hover:text-gray-700 underline transition cursor-pointer"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">Session Storage</span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active (Browser Tab)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-500">Auth Method</span>
            <span className="text-xs font-semibold text-gray-700">x-super-admin-key Header</span>
          </div>
        </div>
      </div>

      {/* Features Reference */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Feature Modules Reference</h3>
        <div className="space-y-2">
          {[
            { key: "posBilling", label: "POS Billing & Order Entry", route: "/api/orders/*", desc: "Core order creation, billing, payment" },
            { key: "qrOrdering", label: "Customer QR Self-Ordering", route: "/api/orders/qr-place", desc: "Customer-facing menu & self-ordering via QR" },
            { key: "kds", label: "Kitchen Display System (KDS)", route: "Frontend only", desc: "Real-time kitchen order screen" },
            { key: "inventory", label: "Inventory & Recipe Control", route: "/api/inventory/*", desc: "Stock tracking, recipe cost control" },
            { key: "vexoAI", label: "VexoAI Chatbot Assistant", route: "/api/chatbot/*", desc: "AI-powered sales, insights & assistant" },
            { key: "whatsappAPI", label: "WhatsApp Automated Alerts", route: "External API", desc: "Order alerts & notifications via WhatsApp" },
            { key: "staffManagement", label: "Staff & Sub-Terminals", route: "/api/auth/staff/*", desc: "Multiple terminal accounts, waiter/kitchen logins" },
            { key: "multiBranch", label: "Multi-Branch Sync", route: "Frontend only", desc: "Manage multiple restaurant branches" },
            { key: "analytics", label: "Expenses & Reports (OPEX)", route: "/api/expenses/*", desc: "Expense tracker, P&L reports" },
            { key: "thermalPrinter", label: "Thermal Printer Direct Print", route: "Frontend only", desc: "ESC/POS print receipt from browser" },
          ].map((f) => (
            <div key={f.key} className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded shrink-0 mt-0.5">{f.key}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{f.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
              </div>
              <span className="text-[9px] font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded shrink-0">{f.route}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CORS Info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">CORS Allowed Origins</h3>
        <div className="space-y-1">
          {[
            "https://app.restuvexo.shop",
            "https://restuvexo.shop",
            "https://www.restuvexo.shop",
            "https://admin.restuvexo.shop",
            "http://localhost:3000 (dev only)"
          ].map((origin) => (
            <div key={origin} className="flex items-center gap-2 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-mono text-gray-700">{origin}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
