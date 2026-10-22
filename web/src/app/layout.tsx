import type { Metadata, Viewport } from "next";
import { Oswald, Source_Sans_3, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const source = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ticket = Share_Tech_Mono({
  variable: "--font-ticket",
  subsets: ["latin"],
  weight: "400",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rak Merah — Compound Slow Moving",
  description: "Digitalisasi inventory, disposisi, dan eksekusi compound slow moving.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Rak Merah" },
};

export const viewport: Viewport = {
  themeColor: "#1a1714",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${oswald.variable} ${source.variable} ${ticket.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
