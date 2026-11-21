import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatterBuds | Real-Time Live Voice Translator",
  description: "Real-time, two-way live voice interpreter for phone & Bluetooth earbud pairs.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChatterBuds",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05070e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-[#05070e] text-slate-100 antialiased h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col bg-[#05070e] font-sans select-none overflow-x-hidden relative">
        {/* Ambient background glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-gradient-to-b from-cyan-500/10 to-transparent rounded-full blur-[100px]" />
          <div className="absolute top-[40%] -left-[20%] w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[5%] -right-[20%] w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
