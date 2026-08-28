/**
 * Universal backend URL resolver that guarantees HTTPS safety in browser environments
 */
export function getBackendUrl(): string {
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (window.location.protocol === "https:") {
      return ""; // Uses relative /api/ reverse-proxied by Nginx
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop";
}

/**
 * Universal Socket.io URL resolver
 */
export function getSocketUrl(): string {
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
      return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    if (window.location.protocol === "https:") {
      return window.location.origin; // Always same-origin on production HTTPS
    }
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop";
}

