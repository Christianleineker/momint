"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Bell, Check, CheckCheck, ClipboardCheck, LogOut, RefreshCw, UserPen, UserRound, Users, X } from "lucide-react";
import { FONTE_ROTULO } from "@/components/ui";

type Usuario = { id: string; nome: string; email: string };
type DadosDashboard = {
  metricas: { aprovacoesPendentes: number };
  ultimosLeads: Array<{ id: string; empresa: string; criadoEm: string; gatilho: { codigo: string } }>;
};
type Notificacao = { id: string; titulo: string; texto: string; href: string; data: string | null; tipo: "lead" | "aprovacao" };
type Menu = "perfil" | "notificacoes" | null;

class ErroHttp extends Error {
  constructor(public status: number) { super("Não foi possível carregar os dados."); }
}

async function carregar<T>(url: string): Promise<T> {
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) throw new ErroHttp(resposta.status);
  return resposta.json();
}

function dataNotificacao(data: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(data));
}

export function DashboardAcoes() {
  const router = useRouter();
  const raiz = useRef<HTMLDivElement>(null);
  const perfilBotao = useRef<HTMLButtonElement>(null);
  const sinoBotao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [filtro, setFiltro] = useState("recentes");
  const [leitura, setLeitura] = useState<{ usuarioId: string; ids: string[] } | null>(null);
  const [erroLeitura, setErroLeitura] = useState("");
  const [erroSaida, setErroSaida] = useState("");
  const [saindo, setSaindo] = useState(false);
  const { data: usuario, error: erroUsuario, mutate: atualizarUsuario } = useSWR<Usuario, ErroHttp>("/api/auth/me", carregar, { shouldRetryOnError: false });
  const { data: dados, error: erroDados, isLoading, mutate: atualizarDados } = useSWR<DadosDashboard>(usuario ? ["notificacoes-dashboard", usuario.id] : null, () => carregar<DadosDashboard>("/api/dashboard"), { shouldRetryOnError: false });

  useEffect(() => {
    if (erroUsuario?.status === 401) router.replace("/login");
  }, [erroUsuario, router]);

  useEffect(() => {
    if (!usuario) return;
    let ids: string[] = [];
    try {
      const salvas: unknown = JSON.parse(localStorage.getItem(`momint:notificacoes-lidas:${usuario.id}`) ?? "[]");
      if (Array.isArray(salvas) && salvas.every((id) => typeof id === "string")) ids = salvas;
    } catch { setErroLeitura("Não foi possível recuperar suas notificações lidas."); }
    setLeitura({ usuarioId: usuario.id, ids });
  }, [usuario?.id]);

  useEffect(() => {
    if (!menu) return;
    painel.current?.querySelector<HTMLElement>("a, button")?.focus();
    function fora(event: PointerEvent) {
      if (!raiz.current?.contains(event.target as Node)) setMenu(null);
    }
    function escapar(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenu(null);
      (menu === "perfil" ? perfilBotao : sinoBotao).current?.focus();
    }
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", escapar);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", escapar);
    };
  }, [menu]);

  const notificacoes = useMemo<Notificacao[]>(() => {
    if (!dados) return [];
    const recentes: Notificacao[] = [...dados.ultimosLeads]
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
      .map((lead) => ({ id: `lead:${lead.id}`, titulo: "Novo lead identificado", texto: `${lead.empresa} · ${FONTE_ROTULO[lead.gatilho.codigo] ?? lead.gatilho.codigo}`, href: "/leads", data: lead.criadoEm, tipo: "lead" }));
    const pendentes = dados.metricas.aprovacoesPendentes;
    if (pendentes) recentes.unshift({ id: `aprovacoes:${pendentes}`, titulo: "Aprovações pendentes", texto: `${pendentes} ${pendentes === 1 ? "abordagem aguarda sua aprovação" : "abordagens aguardam sua aprovação"}.`, href: "/abordagens", data: null, tipo: "aprovacao" });
    return recentes;
  }, [dados]);

  const lidas = leitura?.usuarioId === usuario?.id ? leitura?.ids ?? [] : [];
  const naoLidas = notificacoes.filter((n) => !lidas.includes(n.id));
  const exibidas = filtro === "nao-lidas" ? naoLidas : notificacoes;
  const iniciais = usuario?.nome.trim().split(/\s+/).map((parte) => parte[0]).filter(Boolean).slice(0, 2).join("").toLocaleUpperCase("pt-BR");
  const carregando = (!usuario && !erroUsuario) || isLoading || (!!usuario && leitura?.usuarioId !== usuario.id);

  function marcarLidas(ids: string[]) {
    if (!usuario) return;
    const novas = Array.from(new Set([...lidas, ...ids])).slice(-500);
    setLeitura({ usuarioId: usuario.id, ids: novas });
    try {
      localStorage.setItem(`momint:notificacoes-lidas:${usuario.id}`, JSON.stringify(novas));
      setErroLeitura("");
    } catch { setErroLeitura("A leitura foi atualizada nesta sessão, mas não pôde ser salva no navegador."); }
  }

  async function sair() {
    setSaindo(true);
    setErroSaida("");
    try {
      const resposta = await fetch("/api/auth/logout", { method: "POST" });
      if (!resposta.ok) throw new Error();
      window.location.href = "/login";
    } catch {
      setErroSaida("Não foi possível sair. Tente novamente.");
      setSaindo(false);
    }
  }

  function navegarPerfil(event: KeyboardEvent<HTMLDivElement>) {
    const itens = Array.from(painel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const atual = itens.indexOf(document.activeElement as HTMLElement);
    const indice = event.key === "ArrowDown" ? (atual + 1) % itens.length : event.key === "ArrowUp" ? (atual - 1 + itens.length) % itens.length : event.key === "Home" ? 0 : event.key === "End" ? itens.length - 1 : -1;
    if (indice >= 0) { event.preventDefault(); itens[indice]?.focus(); }
    if (event.key === "Tab") setMenu(null);
  }

  return (
    <div ref={raiz} className="relative flex items-center gap-3">
      <button ref={sinoBotao} type="button" aria-label={naoLidas.length ? `Notificações: ${naoLidas.length} não lidas` : "Notificações"} title="Notificações" aria-haspopup="dialog" aria-expanded={menu === "notificacoes"} aria-controls={menu === "notificacoes" ? "notificacoes-dashboard" : undefined} onClick={() => {
        const abrir = menu !== "notificacoes";
        setMenu(abrir ? "notificacoes" : null);
        if (abrir && usuario) void atualizarDados();
      }} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-acento focus-visible:outline-2 focus-visible:outline-acento">
        <Bell aria-hidden="true" className="h-5 w-5" />
        {!carregando && naoLidas.length > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-fundo">{naoLidas.length > 99 ? "99+" : naoLidas.length}</span>}
      </button>
      <button ref={perfilBotao} type="button" aria-label={usuario ? `Perfil de ${usuario.nome}` : "Perfil do usuário"} title={usuario?.nome ?? "Perfil do usuário"} aria-haspopup="menu" aria-expanded={menu === "perfil"} aria-controls={menu === "perfil" ? "perfil-dashboard" : undefined} onClick={() => setMenu(menu === "perfil" ? null : "perfil")} className="flex h-10 w-10 items-center justify-center rounded-full bg-acento text-sm font-semibold text-white ring-2 ring-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento">
        {iniciais || <UserRound aria-hidden="true" className="h-5 w-5" />}
      </button>

      {menu === "perfil" && (
        <div ref={painel} id="perfil-dashboard" className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="break-words text-sm font-semibold text-navy">{usuario?.nome ?? "Perfil do usuário"}</p>
            <p className="mt-1 break-all text-xs text-slate-500">{usuario?.email ?? (erroUsuario ? "Perfil indisponível" : "Carregando perfil...")}</p>
          </div>
          <div role="menu" aria-label="Opções do perfil" onKeyDown={navegarPerfil}>
            <Link href="/configuracoes" role="menuitem" onClick={() => setMenu(null)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 outline-none hover:bg-blue-50 focus:bg-blue-50"><UserPen aria-hidden="true" className="h-4 w-4" />Editar perfil</Link>
            <button type="button" role="menuitem" disabled={saindo} onClick={sair} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 disabled:opacity-50"><LogOut aria-hidden="true" className="h-4 w-4" />{saindo ? "Saindo..." : "Sair"}</button>
          </div>
          {erroSaida && <p role="alert" className="px-3 py-2 text-xs text-red-600">{erroSaida}</p>}
        </div>
      )}

      {menu === "notificacoes" && (
        <div ref={painel} id="notificacoes-dashboard" role="dialog" aria-label="Notificações" className="absolute right-0 top-full z-50 mt-3 flex max-h-[calc(100dvh-6rem)] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">Notificações {naoLidas.length > 0 && <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-acento">{naoLidas.length}</span>}</h2>
            <button type="button" title="Fechar notificações" aria-label="Fechar notificações" onClick={() => { setMenu(null); sinoBotao.current?.focus(); }} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
          <div role="tablist" aria-label="Filtrar notificações" className="flex gap-5 border-b border-slate-100 px-4">
            {[{ id: "recentes", nome: "Recentes" }, { id: "nao-lidas", nome: "Não lidas" }].map(({ id, nome }) => (
              <button key={id} id={`aba-notificacoes-${id}`} type="button" role="tab" aria-selected={filtro === id} aria-controls="lista-notificacoes" tabIndex={filtro === id ? 0 : -1} onClick={() => setFiltro(id)} onKeyDown={(event) => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  const proximo = event.key === "Home" ? "recentes" : event.key === "End" ? "nao-lidas" : filtro === "recentes" ? "nao-lidas" : "recentes";
                  setFiltro(proximo);
                  document.getElementById(`aba-notificacoes-${proximo}`)?.focus();
                }
              }} className={`border-b-2 pb-2.5 text-xs font-medium ${filtro === id ? "border-acento text-acento" : "border-transparent text-slate-500 hover:text-navy"}`}>{nome}</button>
            ))}
          </div>
          <div id="lista-notificacoes" role="tabpanel" aria-labelledby={`aba-notificacoes-${filtro}`} className="min-h-0 overflow-y-auto">
            {carregando ? <p className="px-4 py-8 text-center text-sm text-slate-500">Carregando notificações...</p>
              : erroDados || erroUsuario ? <div className="px-4 py-6 text-center"><p role="alert" className="text-sm text-slate-500">Não foi possível carregar as notificações.</p><button type="button" onClick={() => { void atualizarUsuario(); void atualizarDados(); }} className="mx-auto mt-3 flex items-center gap-2 text-xs font-medium text-acento"><RefreshCw className="h-4 w-4" />Tentar novamente</button></div>
              : exibidas.length === 0 ? <div className="px-4 py-8 text-center"><Bell aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-slate-300" /><p className="text-sm text-slate-500">{filtro === "nao-lidas" ? "Nenhuma notificação não lida." : "Nenhuma notificação recente."}</p></div>
              : <ul className="divide-y divide-slate-100">
                {exibidas.map((n) => {
                  const lida = lidas.includes(n.id);
                  const Icone = n.tipo === "aprovacao" ? ClipboardCheck : Users;
                  return (
                    <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${lida ? "bg-white" : "bg-blue-50/50"}`}>
                      <span aria-hidden="true" className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.tipo === "aprovacao" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-acento"}`}><Icone className="h-4 w-4" /></span>
                      <Link href={n.href} onClick={() => { marcarLidas([n.id]); setMenu(null); }} className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-acento">
                        <p className="text-xs font-semibold text-navy">{n.titulo}</p>
                        <p className="mt-1 break-words text-xs leading-5 text-slate-500">{n.texto}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{n.data ? dataNotificacao(n.data) : "Aguardando aprovação"}</p>
                      </Link>
                      {!lida && <button type="button" aria-label={`Marcar como lida: ${n.titulo} - ${n.texto}`} title="Marcar como lida" onClick={() => marcarLidas([n.id])} className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-acento hover:bg-blue-100"><Check aria-hidden="true" className="h-4 w-4" /></button>}
                    </li>
                  );
                })}
              </ul>}
          </div>
          {!carregando && !erroDados && !erroUsuario && naoLidas.length > 0 && <button type="button" onClick={() => marcarLidas(naoLidas.map((n) => n.id))} className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-xs font-medium text-acento hover:bg-blue-50"><CheckCheck aria-hidden="true" className="h-4 w-4" />Marcar todas como lidas</button>}
          {erroLeitura && <p role="status" className="border-t border-slate-100 px-4 py-2 text-xs text-amber-700">{erroLeitura}</p>}
        </div>
      )}
    </div>
  );
}
