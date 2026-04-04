import type { Metadata } from "next";
import { Noto_Serif, Work_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const chronicleDisplayFont = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-chronicle-display",
});

const chronicleBodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chronicle-body",
});

export const metadata: Metadata = {
  title: "siedler_OG_II",
  description: "Private room-based Catan-inspired multiplayer prototype.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={`${chronicleDisplayFont.variable} ${chronicleBodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
