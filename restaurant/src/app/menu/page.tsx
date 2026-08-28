"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

function MenuRedirectInner() {
  const searchParams = useSearchParams();
  const qrCode = searchParams.get("qr");

  useEffect(() => {
    const customerOrigin = "https://order.restuvexo.shop";

    if (qrCode) {
      window.location.replace(`${customerOrigin}/scan/${encodeURIComponent(qrCode)}`);
    } else {
      window.location.replace("/dashboard/tables");
    }
  }, [qrCode]);

  return (
    <LoadingScreen
      message="Opening Live Digital Menu..."
      fullScreen={true}
      theme="sunset"
      restaurantName="RESTUVEXO"
    />
  );
}

export default function MenuRedirect() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Loading Digital Menu..."
          fullScreen={true}
          theme="sunset"
          restaurantName="RESTUVEXO"
        />
      }
    >
      <MenuRedirectInner />
    </Suspense>
  );
}
