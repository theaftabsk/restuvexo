"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminRoot() {
  const router = useRouter();

  useEffect(() => {
    // If already logged in, go to dashboard
    const stored = sessionStorage.getItem("sa_key");
    if (stored) {
      router.replace("/super-admin/dashboard");
    }
  }, []);

  // The login screen is handled by layout.js
  return null;
}
