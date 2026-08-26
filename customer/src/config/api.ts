/**
 * Universal backend URL resolver that guarantees HTTPS safety in browser environments
 */
export function getBackendUrl(): string {
  if (typeof window !== "undefined") {
    if (window.location.protocol === "https:") {
      return ""; // Uses relative /api/ reverse-proxied by Nginx with zero Mixed Content issues
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
}
