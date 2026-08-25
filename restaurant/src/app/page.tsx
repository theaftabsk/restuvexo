"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function AppEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication token
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.role === "kitchen") {
          router.replace("/kds");
          return;
        }
        router.replace("/dashboard");
      } catch (e) {
        router.replace("/auth/login");
      }
    } else {
      router.replace("/auth/login");
    }
  }, [router]);

  return (
    <LoadingScreen 
      message="Opening Restaurant Workspace..." 
      fullScreen={true} 
      theme="sunset" 
      restaurantName="RESTUVEXO" 
    />
  );
}
