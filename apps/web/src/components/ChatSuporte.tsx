"use client";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Minus, X } from "lucide-react";
import { Botao } from "./ui";
import { FormMensagem, MensagensSuporte, useAtendimento, type Atendimento } from "./ConversaSuporte";
import { enviar } from "@/lib/api";

export function abrirChatSuporte() { window.dispatchEvent(new Event("momint:abrir-suporte")); }
const campo = "mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-acento";
export function ChatSuporte() {
  const path = usePathname();
  const admin = path.startsWith("/admin");
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erroLeitura, setErroLeitura] = useState("");
  const c = useAtendimento(admin ? null : "/api/suporte/conversa", aberto ? 3000 : 15000);
  useEffect(() => { const abrir = () => setAberto(true); window.addEventListener("momint:abrir-suporte", abrir); return () => window.removeEventListener("momint:abrir-suporte", abrir); }, []);
  const ultima = c.data?.mensagens.at(-1)?.id;
  const naoLidas = c.data?.pendentesVisitante ?? 0;
  useEffect(() => {
    if (!aberto || !ultima || !naoLidas || admin) return;
    let ativo = true;
    void enviar("/api/suporte/lida", "POST", { ate: ultima }).then(() => { if (ativo) { setErroLeitura(""); void c.mutate(); } }).catch(() => { if (ativo) setErroLeitura("Não foi possível atualizar a leitura desta conversa."); });
    return () => { ativo = false; };
  }, [aberto, ultima, naoLidas, admin, c.mutate]);
  if (admin) return null;
  async function iniciar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (ocupado) return; const f = new FormData(e.currentTarget); setErro(""); setOcupado(true);
    try { const d = await enviar<Atendimento>("/api/suporte/conversa", "POST", { nome: f.get("nome"), ...(f.get("email") ? { email: f.get("email") } : {}), assunto: f.get("assunto"), conteudo: f.get("conteudo"), idEnvio: crypto.randomUUID() }); await c.mutate(d, false); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível iniciar a conversa."); }
    finally { setOcupado(false); }
  }
  if (!aberto) return <button type="button" onClick={() => setAberto(true)} aria-label={`Abrir chat de suporte${naoLidas ? `, ${naoLidas} mensagens novas` : ""}`} className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-navy-2"><MessageCircle className="h-5 w-5 text-sky-300" /><span>Suporte</span>{naoLidas > 0 && <span className="rounded-full bg-red-500 px-2 text-xs">{naoLidas}</span>}</button>;
  return <aside aria-label="Chat de suporte Momint" className="fixed bottom-4 right-4 z-50 flex h-[min(580px,calc(100dvh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between gap-2 bg-navy p-4 text-white"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="h-5 w-5 text-sky-300" />Suporte Momint</h2><p className="mt-1 text-[11px] text-slate-300">Dúvidas, ajuda ou interesse no sistema</p></div><div className="flex gap-1"><button aria-label="Minimizar chat" title="Minimizar" onClick={() => setAberto(false)} className="rounded p-1.5 hover:bg-white/10"><Minus className="h-4 w-4" /></button><button aria-label="Fechar chat" title="Fechar" onClick={() => setAberto(false)} className="rounded p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button></div></header>
    {c.isLoading ? <p className="p-6 text-sm text-slate-500">Carregando atendimento…</p> : c.error ? <div role="alert" className="p-6 text-sm text-red-600">Não foi possível carregar o atendimento. <button onClick={() => void c.mutate()} className="underline">Tentar novamente</button></div> : c.data ? <><p className="shrink-0 border-b border-slate-100 px-4 py-2 text-[10px] text-slate-400">Conversa vinculada a este navegador.{c.data.encerrada ? " Envie uma mensagem para reabrir o atendimento." : " O administrador responderá por aqui."}</p><MensagensSuporte mensagens={c.mensagens} leitor="VISITANTE" temMais={c.temMais} carregarMais={() => void c.carregarAnteriores()} carregandoMais={c.carregandoMais} erro={c.erroAnteriores} />{erroLeitura && <p role="status" className="px-3 text-xs text-amber-700">{erroLeitura}</p>}<FormMensagem enviar={async (conteudo, idEnvio) => { await enviar("/api/suporte/mensagens", "POST", { conteudo, idEnvio }); await c.mutate(); }} /></> : <form onSubmit={iniciar} className="min-h-0 space-y-3 overflow-y-auto p-5"><p className="text-sm leading-6 text-slate-500">Converse com nossa equipe. Você pode pedir ajuda ou conhecer os sistemas Momint.</p><label className="block text-sm font-medium">Seu nome<input name="nome" className={campo} autoComplete="name" required minLength={2} maxLength={100} /></label><label className="block text-sm font-medium">E-mail para contato (opcional)<input name="email" type="email" autoComplete="email" maxLength={254} className={campo} /></label><label className="block text-sm font-medium">Assunto<select name="assunto" className={campo}><option value="SUPORTE">Preciso de ajuda</option><option value="COMERCIAL">Quero conhecer ou comprar o sistema</option></select></label><label className="block text-sm font-medium">Como podemos ajudar?<textarea name="conteudo" className={campo} rows={3} maxLength={2000} required /></label>{erro && <p role="alert" className="text-xs text-red-600">{erro}</p>}<Botao disabled={ocupado}>{ocupado ? "Enviando…" : "Iniciar conversa"}</Botao></form>}
  </aside>;
}
