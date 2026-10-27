"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings, UserRound } from "lucide-react";
import { PerfilEditor } from "./PerfilEditor";
import type { Perfil } from "@/lib/perfil";

export function ConfiguracoesAbas({ children, perfil }: { children: React.ReactNode; perfil: Perfil }) {
  const router = useRouter();
  const params = useSearchParams();
  const perfilAberto = params.get("aba") === "perfil";
  return <><nav aria-label="Abas de configurações" className="mb-6 flex gap-1 border-b border-slate-200">{[{ perfil: false, titulo: "Sistema e equipe", icone: Settings }, { perfil: true, titulo: "Meu perfil", icone: UserRound }].map(a => <button key={a.titulo} type="button" aria-current={perfilAberto === a.perfil ? "page" : undefined} onClick={() => router.replace(a.perfil ? "/configuracoes?aba=perfil" : "/configuracoes", { scroll: false })} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${perfilAberto === a.perfil ? "border-acento text-acento" : "border-transparent text-slate-500 hover:text-navy"}`}><a.icone className="h-4 w-4" />{a.titulo}</button>)}</nav>{perfilAberto ? <><h1 className="mb-6 text-3xl font-bold text-navy">Meu perfil</h1><PerfilEditor perfil={perfil} /></> : children}</>;
}
