import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL('https://restuvexo.shop'),
  title: "RESTUVEXO | Top Restaurant Management System & Software",
  description: "RESTUVEXO is the ultimate restaurant management system and restaurant management software. Streamline operations with our AI-powered POS, KDS, and QR ordering features.",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["restuvexo", "restaurant management system", "restaurant management software", "restaurant os", "pos", "kds", "qr ordering", "best restaurant software"],
  authors: [{ name: "ITVEXO" }],
  creator: "ITVEXO",
  publisher: "ITVEXO",
  openGraph: {
    title: "RESTUVEXO | Top Restaurant Management System & Software",
    description: "RESTUVEXO is the ultimate restaurant management system and restaurant management software. Streamline operations with our AI-powered POS, KDS, and QR ordering features.",
    url: 'https://restuvexo.shop',
    siteName: 'RESTUVEXO',
    images: [
      {
        url: '/restuvexo_logo.png',
        width: 800,
        height: 600,
        alt: 'RESTUVEXO Restaurant Management Software Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RESTUVEXO | Top Restaurant Management System & Software',
    description: 'RESTUVEXO is the ultimate restaurant management system and restaurant management software. Streamline operations with our AI-powered POS, KDS, and QR ordering.',
    images: ['/restuvexo_logo.png'],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RESTUVEXO Restaurant System"
  },
  formatDetection: {
    telephone: false
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${plusJakartaSans.variable} ${plusJakartaSans.className} min-h-full flex flex-col bg-background text-foreground tracking-tight antialiased`}>
        {children}
      </body>
    </html>
  );
}
