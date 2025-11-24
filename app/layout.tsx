import type { Metadata } from "next";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";

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
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}

