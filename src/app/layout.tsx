import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { PwaProvider } from "@/components/pwa-provider";
import "./globals.css";

const sentient = localFont({
  variable: "--font-sentient",
  display: "swap",
  src: [
    { path: "./fonts/Sentient-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Sentient-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "./fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Voltair Studio Portal", template: "%s · Voltair Studio" },
  description: "The Voltair Studio client portal — projects, deliverables, approvals.",
  applicationName: "Voltair Portal",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Voltair Portal",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sentient.variable} ${satoshi.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-brand-obsidian text-ink">
        <CapacitorProvider />
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
