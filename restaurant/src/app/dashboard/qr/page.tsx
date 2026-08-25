"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function QrRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Fast redirect to unified Tables & QR management portal
    router.replace("/dashboard/tables");
  }, [router]);

  return (
    <LoadingScreen
      message="Opening Tables & QR Floor Manager..."
      fullScreen={true}
      theme="sunset"
      restaurantName="RESTUVEXO"
    />
  );
}
