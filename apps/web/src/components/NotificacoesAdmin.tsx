"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Bell, Building2, Check, CheckCheck, Monitor, RefreshCw, Trash2, X } from "lucide-react";
import { enviar, ErroApi, lerJson } from "@/lib/api";

interface Notificacao { id: string; tipo: string; titulo: string; texto: string; criadoEm: string; lidaEm: string | null }
interface Dados { itens: Notificacao[]; naoLidas: number }
export const CHAVE_NOTIFICACOES_ADMIN = "/api/admin/notificacoes";

export function NotificacoesAdmin() {
  const { data, error, isLoading, mutate } = useSWR<Dados>(CHAVE_NOTIFICACOES_ADMIN, lerJson, { refreshInterval: 15_000 });
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState("recentes");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setAberto(false); }
    function tecla(e: KeyboardEvent) { if (e.key === "Escape") { setAberto(false); botao.current?.focus(); } }
    document.addEventListener("mousedown", fora); document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", tecla); };
  }, [aberto]);
  useEffect(() => { if (error instanceof ErroApi && [401, 403].includes(error.status)) window.location.href = "/entrada"; }, [error]);
  async function marcar(ids?: string[]) {
    setErro(""); setSalvando(true);
    try { await enviar(CHAVE_NOTIFICACOES_ADMIN, "PATCH", ids ? { ids } : { todas: true }); await mutate(); }
    catch { setErro("Não foi possível marcar as notificações como lidas."); }
    finally { setSalvando(false); }
  }
  const itens = (data?.itens ?? []).filter(n => filtro === "recentes" || !n.lidaEm);
  return <div ref={ref} className="relative">
    <button ref={botao} type="button" aria-label={`Notificações${data?.naoLidas ? `, ${data.naoLidas} não lidas` : ""}`} aria-expanded={aberto} onClick={() => { setAberto(!aberto); if (!aberto) void mutate(); }} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-acento focus-visible:outline-2 focus-visible:outline-acento"><Bell className="h-5 w-5" />{!!data?.naoLidas && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">{data.naoLidas > 99 ? "99+" : data.naoLidas}</span>}</button>
    {aberto && <section aria-label="Notificações da administração" className="absolute right-0 top-12 z-40 flex max-h-[min(560px,75dvh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-20 max-sm:w-auto">
      <div className="flex items-center justify-between px-4 py-3"><h2 className="text-sm font-semibold text-navy">Notificações {!!data?.naoLidas && <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-acento">{data.naoLidas}</span>}</h2><button aria-label="Fechar notificações" onClick={() => { setAberto(false); botao.current?.focus(); }} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      <div className="flex gap-5 border-b border-slate-100 px-4">{[{ id: "recentes", titulo: "Recentes" }, { id: "nao-lidas", titulo: "Não lidas" }].map(a => <button key={a.id} type="button" aria-pressed={filtro === a.id} onClick={() => setFiltro(a.id)} className={`border-b-2 pb-2.5 text-xs font-medium ${filtro === a.id ? "border-acento text-acento" : "border-transparent text-slate-500"}`}>{a.titulo}</button>)}</div>
      <div className="min-h-0 overflow-y-auto">{isLoading ? <p className="p-8 text-center text-sm text-slate-500">Carregando notificações…</p> : error ? <div className="p-6 text-center"><p role="alert" className="text-sm text-slate-500">Não foi possível carregar as notificações.</p><button onClick={() => void mutate()} className="mt-3 inline-flex items-center gap-2 text-xs text-acento"><RefreshCw className="h-4 w-4" />Tentar novamente</button></div> : !itens.length ? <div className="p-8 text-center"><Bell className="mx-auto mb-3 h-7 w-7 text-slate-300" /><p className="text-sm text-slate-500">{filtro === "nao-lidas" ? "Nenhuma notificação não lida entre as recentes." : "Nenhuma notificação recente."}</p></div> : <ul className="divide-y divide-slate-100">{itens.map(n => {
        const Icone = n.tipo === "CLIENTE_EXCLUIDO" ? Trash2 : n.tipo.startsWith("SISTEMA") ? Monitor : Building2;
        return <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.lidaEm ? "bg-white" : "bg-blue-50/50"}`}><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-acento"><Icone className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-navy">{n.titulo}</p><p className="mt-1 break-words text-xs leading-5 text-slate-500">{n.texto}</p><time className="mt-1 block text-[11px] text-slate-400" dateTime={n.criadoEm}>{new Date(n.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</time></div>{!n.lidaEm && <button disabled={salvando} aria-label={`Marcar como lida: ${n.titulo}`} onClick={() => void marcar([n.id])} className="h-7 rounded p-1 text-acento hover:bg-blue-100"><Check className="h-4 w-4" /></button>}</li>;
      })}</ul>}</div>
      {!!data?.naoLidas && <button disabled={salvando} onClick={() => void marcar()} className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-xs font-medium text-acento hover:bg-blue-50"><CheckCheck className="h-4 w-4" />Marcar todas como lidas</button>}
      {erro && <p role="alert" className="border-t border-slate-100 p-3 text-xs text-red-600">{erro}</p>}
    </section>}
  </div>;
}
