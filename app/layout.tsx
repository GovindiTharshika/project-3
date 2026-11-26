import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subscript — Subscription intelligence",
  description: "Subscription analytics and operations workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
