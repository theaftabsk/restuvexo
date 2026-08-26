import { getBackendUrl } from "@/config/api";
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  Download,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Calendar,
  CreditCard
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

export default function SubscriptionInvoicesPage() {
  const BACKEND_URL = getBackendUrl();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/my-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load invoices:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingScreen message="Loading billing invoices..." minHeight="50vh" />;
  }

  const sub = data?.subscription;
  const payments = sub?.payments || [];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto text-slate-800 font-sans pb-16 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/subscription"
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-[#ff5722]" />
              SaaS Tax Invoices
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Official GST-compliant billing receipts for RESTUVEXO ROS
            </p>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden p-6 md:p-8 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Plan / Description</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No tax invoices generated yet.
                  </td>
                </tr>
              ) : (
                payments.map((p: any, idx: number) => {
                  const invoiceNo = `INV-SUB-${String(p.id).padStart(5, "0")}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-4 font-mono font-black text-slate-900">{invoiceNo}</td>
                      <td className="py-4 px-4 font-bold text-slate-700">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-4 px-4 font-black text-slate-900">
                        RESTUVEXO {sub?.plan?.name || "Growth"} Subscription
                      </td>
                      <td className="py-4 px-4 font-black text-slate-900 text-sm">
                        ₹{parseFloat(p.amount).toFixed(2)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>PAID</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedInvoice({ ...p, invoiceNo })}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-[#ff5722] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-sm cursor-pointer"
                        >
                          View & Print
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
          <div className="bg-white rounded-[2rem] p-8 md:p-10 w-full max-w-2xl shadow-2xl border border-slate-200 text-slate-800 space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
            {/* Modal Controls (Hidden in print) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <span className="text-xs font-black uppercase tracking-widest text-[#ff5722]">Official Tax Invoice</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Invoice Printable Template */}
            <div className="space-y-6 font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">RESTUVEXO ROS</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Multi-Tenant Restaurant Operating SaaS</p>
                  <p className="text-[11px] font-mono text-slate-400">GSTIN: 27AABCR1234F1Z5</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-black text-slate-900">{selectedInvoice.invoiceNo}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">
                    Date: {new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px] uppercase">
                    Paid via {selectedInvoice.gateway || "Cashfree"}
                  </span>
                </div>
              </div>

              {/* Billed To */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Billed To</span>
                <p className="text-sm font-black text-slate-900 mt-1">{sub?.restaurant?.name || "Restaurant Owner"}</p>
                <p className="font-semibold text-slate-600">Email: {sub?.restaurant?.email || "owner@restuvexo.shop"}</p>
                <p className="font-semibold text-slate-600">Phone: {sub?.restaurant?.phone || "N/A"}</p>
              </div>

              {/* Line Items */}
              <table className="w-full text-left text-xs border-collapse border-b border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Cycle</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  <tr>
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 block">RESTUVEXO {sub?.plan?.name || "Growth"} Subscription</strong>
                      <span className="text-[10px] text-slate-500">{selectedInvoice.notes || "Monthly Cloud POS & KDS License"}</span>
                    </td>
                    <td className="py-3 px-3 text-center">30 Days</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                      ₹{parseFloat(selectedInvoice.amount).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end text-xs">
                <div className="w-48 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-500">
                    <span>Subtotal:</span>
                    <span>₹{parseFloat(selectedInvoice.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-500">
                    <span>GST (18% Included):</span>
                    <span>₹{(parseFloat(selectedInvoice.amount) * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 text-sm pt-2 border-t border-slate-200">
                    <span>Total Paid:</span>
                    <span className="text-[#ff5722]">₹{parseFloat(selectedInvoice.amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 text-center text-[10px] font-semibold text-slate-400">
                Thank you for choosing RESTUVEXO Cloud Restaurant Operating System.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
