import type { Metadata } from "next";
import type { ReactNode } from "react";
import PwaRegister from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "SkulGo",
  description: "Transparent & Secure Records.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f6f8f7", color: "#17221d" }}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
