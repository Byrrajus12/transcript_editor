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
  title: "Smart Transcript Editor",
  description: "An intuitive transcript editor built with Next.js and TypeScript",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          background: `
            linear-gradient(120deg, rgba(245, 215, 220, 0.55) 0%, rgba(210, 225, 245, 0.55) 100%)
          `,
          backgroundSize: "100% 100%",
        }}
      >
        {children}
      </body>
    </html>
  );
}
