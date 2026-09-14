import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Green Basket School",
  description: "School operations platform by Green Basket Global Limited.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f6f8f7", color: "#17221d" }}>
        {children}
      </body>
    </html>
  );
}
