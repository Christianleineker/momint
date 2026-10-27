"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Send } from "lucide-react";
import { Botao } from "./ui";
import { lerJson } from "@/lib/api";

export interface MensagemAtendimento { id: string; autor: "VISITANTE" | "ADMIN"; nomeAutor: string; conteudo: string; criadoEm: string }
export interface Atendimento {
  id: string; nome: string; email: string | null; assunto: string; encerrada: boolean;
  pendentesAdmin: number; pendentesVisitante: number; ultimaMensagemEm: string;
  mensagens: MensagemAtendimento[]; temAnteriores: boolean;
}
export function useAtendimento(url: string | null, intervalo = 3000) {
  const swr = useSWR<Atendimento | null>(url, lerJson, { refreshInterval: intervalo });
  const [anteriores, setAnteriores] = useState<MensagemAtendimento[]>([]);
  const [temMais, setTemMais] = useState<boolean | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroAnteriores, setErroAnteriores] = useState("");
  const urlAtual = useRef(url);
  const ultimaPagina = useRef<MensagemAtendimento | null>(null);
  useEffect(() => { urlAtual.current = url; ultimaPagina.current = null; setAnteriores([]); setTemMais(null); setErroAnteriores(""); setCarregandoMais(false); }, [url]);
  useEffect(() => {
    const pagina = swr.data?.mensagens;
    if (!pagina?.length) return;
    const anterior = ultimaPagina.current;
    const lacuna = anterior && pagina.length === 100 && (pagina[0].criadoEm > anterior.criadoEm || (pagina[0].criadoEm === anterior.criadoEm && pagina[0].id > anterior.id));
    if (lacuna) { setAnteriores(pagina); setTemMais(null); }
    else setAnteriores(a => [...new Map([...a, ...pagina].map(m => [m.id, m])).values()]);
    ultimaPagina.current = pagina.at(-1)!;
  }, [swr.data]);
  const mensagens = useMemo(() => {
    const mapa = new Map([...anteriores, ...(swr.data?.mensagens ?? [])].map(m => [m.id, m]));
    return [...mapa.values()].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || a.id.localeCompare(b.id));
  }, [anteriores, swr.data]);
  async function carregarAnteriores() {
    if (!url || !mensagens.length) return;
    setCarregandoMais(true); setErroAnteriores("");
    try { const d = await lerJson<Atendimento>(`${url}?antes=${encodeURIComponent(mensagens[0].id)}`); if (urlAtual.current !== url) return; setAnteriores(a => [...d.mensagens, ...a]); setTemMais(d.temAnteriores); }
    catch { if (urlAtual.current === url) setErroAnteriores("Não foi possível carregar as mensagens anteriores."); }
    finally { if (urlAtual.current === url) setCarregandoMais(false); }
  }
  return { ...swr, mensagens, temMais: temMais ?? swr.data?.temAnteriores ?? false, carregarAnteriores, carregandoMais, erroAnteriores };
}

export function MensagensSuporte({ mensagens, leitor, temMais, carregarMais, carregandoMais, erro }: { mensagens: MensagemAtendimento[]; leitor: "VISITANTE" | "ADMIN"; temMais: boolean; carregarMais: () => void; carregandoMais: boolean; erro: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const ultimoId = mensagens.at(-1)?.id;
  useEffect(() => { if (caixa.current) caixa.current.scrollTop = caixa.current.scrollHeight; }, [ultimoId]);
  return <div ref={caixa} role="log" aria-label="Mensagens do atendimento" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
    {temMais && <div className="text-center"><button disabled={carregandoMais} className="text-xs text-acento disabled:opacity-50" onClick={carregarMais}>{carregandoMais ? "Carregando…" : "Ver mensagens anteriores"}</button></div>}
    {erro && <p role="alert" className="text-xs text-red-600">{erro}</p>}
    {mensagens.map(m => <div key={m.id} className={`flex ${m.autor === leitor ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 ${m.autor === leitor ? "rounded-br-sm bg-acento text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"}`}><p className={`mb-1 text-[10px] font-semibold ${m.autor === leitor ? "text-blue-100" : "text-acento"}`}>{m.autor === "ADMIN" ? `${m.nomeAutor} · Admin` : m.nomeAutor}</p><p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{m.conteudo}</p><time dateTime={m.criadoEm} className={`mt-1 block text-right text-[10px] ${m.autor === leitor ? "text-blue-100" : "text-slate-400"}`}>{new Date(m.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</time></div></div>)}
  </div>;
}

export function FormMensagem({ enviar }: { enviar: (conteudo: string, idEnvio: string) => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const idEnvio = useRef("");
  async function submeter(e: FormEvent) {
    e.preventDefault(); if (!texto.trim() || ocupado) return;
    if (!idEnvio.current) idEnvio.current = crypto.randomUUID();
    setOcupado(true); setErro("");
    try { await enviar(texto.trim(), idEnvio.current); setTexto(""); idEnvio.current = ""; }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível enviar a mensagem."); }
    finally { setOcupado(false); }
  }
  return <form onSubmit={submeter} className="shrink-0 space-y-2 border-t border-slate-200 bg-white p-3"><div className="flex items-end gap-2"><label className="flex-1"><span className="sr-only">Mensagem</span><textarea name="mensagem" placeholder="Escreva sua mensagem…" maxLength={2000} required rows={2} disabled={ocupado} value={texto} onChange={e => { setTexto(e.target.value); idEnvio.current = ""; }} className="block max-h-32 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-acento" /></label><Botao type="submit" disabled={ocupado || !texto.trim()} aria-label="Enviar mensagem"><Send className="h-4 w-4" /></Botao></div>{erro && <p role="alert" className="text-xs text-red-600">{erro}</p>}</form>;
}
