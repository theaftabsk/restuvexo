"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function OrderCreateRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Fast redirect to unified POS terminal
    router.replace("/dashboard/pos");
  }, [router]);

  return (
    <LoadingScreen
      message="Opening POS Billing Terminal..."
      fullScreen={true}
      theme="sunset"
      restaurantName="RESTUVEXO"
    />
  );
}
