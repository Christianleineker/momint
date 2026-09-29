import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Momint", description: "Prospecção B2B guiada por gatilhos" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
