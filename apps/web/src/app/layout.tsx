import type { Metadata } from "next";
import "./globals.css";
import { ChatSuporte } from "@/components/ChatSuporte";
import { Alertas } from "@/components/Alertas";
import { IndicadorCarregamento } from "@/components/IndicadorCarregamento";
import { ProvedorDados } from "@/components/ProvedorDados";

export const metadata: Metadata = { title: "Momint", description: "Prospecção B2B guiada por gatilhos" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased"><ProvedorDados>{children}<ChatSuporte /></ProvedorDados><Alertas /><IndicadorCarregamento /></body>
    </html>
  );
}
