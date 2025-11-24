import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WAWISync",
  description: "Synchronisation von Warenbeständen zwischen POS-System und Shopify",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

