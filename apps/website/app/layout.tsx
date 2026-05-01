import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://agent-install.dev",
  ),
  title: "agent-install",
  description: "Install agent skills and MCPs with one API.",
  openGraph: {
    title: "agent-install",
    description: "Install agent skills and MCPs with one API.",
    siteName: "agent-install",
    url: "https://agent-install.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "agent-install",
    description: "Install agent skills and MCPs with one API.",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html
    lang="en"
    className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    suppressHydrationWarning
  >
    <body className="min-h-full flex flex-col" suppressHydrationWarning>
      {children}
    </body>
  </html>
);

export default RootLayout;
