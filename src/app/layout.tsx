import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "VEILBREAK — Vanguard Operations",
  description: "The silence ends with you. An original futuristic FPS with a 16-operation campaign, tactical bot combat, survival, and a persistent career.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
