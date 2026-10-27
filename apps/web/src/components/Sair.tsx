"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
export function Sair() {
  const [erro, setErro] = useState(false);
  return <div><button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={async () => {
    try { const r = await fetch("/api/auth/logout", { method: "POST" }); if (!r.ok) throw new Error(); window.location.href = "/login"; } catch { setErro(true); }
  }}><LogOut className="h-4 w-4" /> Sair</button>{erro && <p role="alert">Não foi possível sair. Tente novamente.</p>}</div>;
}
