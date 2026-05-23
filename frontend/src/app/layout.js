import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "RESTUVEXO AI-Powered Restaurant Operating System — POS, KDS & QR Menu",
  description: "Enterprise-grade decoupled AI-powered Restaurant Operating System for tables, order queues, POS checkout, and real-time inventory management.",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["restaurant os", "pos", "kds", "qr ordering", "restaurant software", "restuvexo"],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RESTUVEXO AI-powered ROS"
  },
  formatDetection: {
    telephone: false
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.variable} min-h-full flex flex-col bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
