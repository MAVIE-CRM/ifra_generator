import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IFRA_GENERATOR | Perfume Compliance Tool",
  description: "Manage raw materials, import from Fraterworks, and calculate IFRA compliance for fragrance formulas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased pt-24 min-h-screen`}>
        <Navigation />
        <main className="max-w-7xl mx-auto px-6 pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
