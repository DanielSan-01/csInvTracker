import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CS Inventory Tracker",
  description: "Track your CS:GO inventory",
  icons: {
    icon: "/favicon-purple.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon-purple.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-md focus:bg-purple-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <UserProvider>
          <div className="flex min-h-screen flex-col">
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <footer className="border-t border-gray-800 bg-black/70 py-3 text-center text-xs text-gray-400">
              csinvtracker.com © 2025 — not affiliated with Valve.
            </footer>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
