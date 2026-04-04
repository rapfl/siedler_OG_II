import type { Metadata } from "next";
import { Barlow, Bebas_Neue } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const displayFont = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
});

const bodyFont = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "siedler_OG_II",
  description: "Private room-based Catan-inspired multiplayer prototype.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
