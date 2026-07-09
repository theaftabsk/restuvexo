"use client";

import { useState, useEffect } from "react";
import { useAdminAuth } from "../layout";
import Link from "next/link";

function StatCard({ label, value, sub, color = "gray", icon }) {
  const colors = {
    orange: "bg-orange-50 border-orange-100 text-orange-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    rose: "bg-rose-50 border-rose-100 text-rose-600",
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    violet: "bg-violet-50 border-violet-100 text-violet-600",
    gray: "bg-gray-50 border-gray-100 text-gray-600",
    amber: "bg-amber-50 border-amber-100 text-amber-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${colors[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { passkey, BACKEND_URL } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/super-admin/stats`, {
          headers: { "x-super-admin-key": passkey }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.data);
        } else {
          setError("Failed to load stats.");
        }
      } catch {
        setError("Cannot connect to backend.");
      } finally {
        setLoading(false);
      }
    };
    if (passkey) fetchStats();
  }, [passkey]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-6 font-medium">
        {error}
      </div>
    );
  }

  const sub = stats?.subscription || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Welcome Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">Real-time operational telemetry for all RESTUVEXO tenants</p>
        </div>
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
          LIVE
        </span>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Restaurants"
          value={stats?.totalRestaurants ?? "—"}
          sub={`+${stats?.newSignupsToday ?? 0} today`}
          color="orange"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard
          label="Active Trials"
          value={sub?.trialActive ?? "—"}
          sub={`${sub?.trialExpired ?? 0} expired`}
          color="amber"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Paid Accounts"
          value={(sub?.customActive ?? 0) + (sub?.activePaid ?? 0)}
          sub={`${sub?.lifetime ?? 0} lifetime`}
          color="emerald"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Suspended"
          value={sub?.suspended ?? "—"}
          color="rose"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
        />
        <StatCard
          label="Monthly Revenue"
          value={`₹${Number(stats?.totalMonthlyRevenue ?? 0).toLocaleString("en-IN")}`}
          sub="Across all custom plans"
          color="violet"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Total Orders"
          value={stats?.totalOrders ?? "—"}
          color="blue"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="Demo Requests"
          value={stats?.totalDemoRequests ?? "—"}
          sub={`${stats?.pendingDemoRequests ?? 0} pending follow-up`}
          color="orange"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
        />
        <StatCard
          label="New Signups (7d)"
          value={stats?.newSignups7Days ?? "—"}
          color="gray"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
        />
      </div>

      {/* Subscription Breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Subscription Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          {[
            { label: "Trial Active", value: sub?.trialActive, color: "amber" },
            { label: "Trial Expired", value: sub?.trialExpired, color: "rose" },
            { label: "Custom Active", value: sub?.customActive, color: "emerald" },
            { label: "Lifetime", value: sub?.lifetime, color: "violet" },
            { label: "Suspended", value: sub?.suspended, color: "rose" },
          ].map((item) => {
            const bg = {
              amber: "bg-amber-50 text-amber-700 border-amber-200",
              rose: "bg-rose-50 text-rose-700 border-rose-200",
              emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
              violet: "bg-violet-50 text-violet-700 border-violet-200",
            }[item.color] || "bg-gray-50 text-gray-700 border-gray-200";
            return (
              <div key={item.label} className={`border rounded-xl p-3 ${bg}`}>
                <p className="text-xl font-bold">{item.value ?? 0}</p>
                <p className="text-[10px] font-semibold mt-0.5 opacity-80">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/super-admin/restaurants", label: "Manage Restaurants", desc: "Configure features, pricing, and trial states", color: "orange" },
          { href: "/super-admin/demo-requests", label: "Demo Requests", desc: `${stats?.pendingDemoRequests ?? 0} awaiting follow-up`, color: "blue" },
          { href: "/super-admin/settings", label: "System Settings", desc: "API keys, defaults, and global config", color: "gray" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group"
          >
            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{link.label}</h4>
            <p className="text-xs text-gray-400 mt-1">{link.desc}</p>
            <div className="mt-3 flex items-center gap-1 text-orange-500 text-[11px] font-semibold">
              Open <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
