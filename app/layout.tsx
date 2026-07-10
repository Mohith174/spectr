import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SPECTR — Solana Token Intelligence",
  description: "Forensic-grade Solana token risk analysis. Detect scams before you lose money.",
};

const isDemoMode = process.env.DEMO_MODE === "true";

const clerkAppearance = {
  variables: {
    colorBackground: "#0f0f0f",
    colorPrimary: "#f0f0f0",
    colorText: "#f0f0f0",
    colorTextSecondary: "#a0a0a0",
    colorInputBackground: "#141414",
    colorInputText: "#f0f0f0",
    fontFamily: "'JetBrains Mono', monospace",
    borderRadius: "2px",
  },
  elements: {
    card: "border border-[#252525] shadow-none",
    headerTitle: "font-mono tracking-widest text-sm uppercase",
    headerSubtitle: "font-mono text-xs",
    formButtonPrimary: "font-mono tracking-widest text-xs uppercase bg-[#f0f0f0] text-[#080808] hover:bg-[#d0d0d0]",
    footerActionLink: "font-mono text-xs text-[#a0a0a0] hover:text-[#f0f0f0]",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.variable} font-mono antialiased bg-bg text-primary`}>
        <div className="scanlines"></div>
        {children}
      </body>
    </html>
  );

  // Demo deployments run with no Clerk keys configured — ClerkProvider
  // throws without a publishable key, so it's skipped entirely.
  if (isDemoMode) return body;

  return <ClerkProvider appearance={clerkAppearance}>{body}</ClerkProvider>;
}
