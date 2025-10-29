import Image from "next/image";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen`}
      >
        <Image
          src="/gradient-background.jpg"
          alt="Background"
          fill
          priority
          sizes="100vw"
          style={{
            objectFit: "cover",
            zIndex: -1,
          }}
        />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
