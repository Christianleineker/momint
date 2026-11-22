"use client";
import { alerta } from "@/lib/alertas";
import { requisitar } from "@/lib/api";
import { LogOut } from "lucide-react";
export function Sair() {
  return <div><button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={async () => {
    try { const r = await requisitar("/api/auth/logout", { method: "POST" }); if (!r.ok) throw new Error(); window.location.href = "/login"; } catch { alerta.erro("Não foi possível sair. Tente novamente."); }
  }}><LogOut className="h-4 w-4" /> Sair</button></div>;
}
