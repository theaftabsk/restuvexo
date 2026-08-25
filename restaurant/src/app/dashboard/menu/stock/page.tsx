"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function MenuStockRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Fast redirect to unified Smart Menu Manager with multi-mode stock tabs
    router.replace("/dashboard/menu");
  }, [router]);

  return (
    <LoadingScreen
      message="Opening Smart Menu Manager..."
      fullScreen={true}
      theme="sunset"
      restaurantName="RESTUVEXO"
    />
  );
}
