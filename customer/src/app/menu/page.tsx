"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CustomerMenuRedirectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qrCode = searchParams.get("qr");

  useEffect(() => {
    if (qrCode) {
      router.replace(`/scan/${encodeURIComponent(qrCode)}`);
    } else {
      router.replace("/");
    }
  }, [qrCode, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 text-center space-y-4">
      <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-400 tracking-wider uppercase">Loading Digital Menu...</p>
    </div>
  );
}

export default function CustomerMenuRedirect() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 text-center">
          <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <CustomerMenuRedirectInner />
    </Suspense>
  );
}
