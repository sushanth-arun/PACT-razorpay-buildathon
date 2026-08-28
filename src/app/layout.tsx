import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import ClickSpark from "@/components/ClickSpark";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PACT — AI-to-AI Agentic Commerce Engine",
  description: "Making merchants transactable by AI buyers with deterministic policy enforcement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 flex min-h-screen relative overflow-x-hidden`}
      >
        <ClickSpark
          sparkColor="#ffffff"
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
        >
          <div className="flex min-h-screen w-full pl-64">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopHeader />
              <main className="flex-1 bg-slate-950/50">{children}</main>
            </div>
          </div>
        </ClickSpark>
      </body>
    </html>
  );
}






