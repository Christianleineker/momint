"use client";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { MessageCircle, Search } from "lucide-react";
import { Badge, Botao, Cabecalho } from "@/components/ui";
import { FormMensagem, MensagensSuporte, useAtendimento } from "@/components/ConversaSuporte";
import { CHAVE_NOTIFICACOES_ADMIN } from "@/components/NotificacoesAdmin";
import { enviar, lerJson } from "@/lib/api";

interface Resumo { id: string; nome: string; email: string | null; assunto: string; encerrada: boolean; pendentesAdmin: number; mensagens: { conteudo: string }[] }
export default function SuporteAdmin() {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [consulta, setConsulta] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { mutate } = useSWRConfig();
  useEffect(() => { const t = window.setTimeout(() => setConsulta(busca.trim()), 300); return () => window.clearTimeout(t); }, [busca]);
  const lista = useSWR<{ conversas: Resumo[]; naoLidas: number }>(`/api/admin/suporte?busca=${encodeURIComponent(consulta)}`, lerJson, { refreshInterval: 3000 });
  const c = useAtendimento(selecionado ? `/api/admin/suporte/${selecionado}` : null);
  useEffect(() => { if (!selecionado && lista.data?.conversas.length) setSelecionado(lista.data.conversas[0].id); }, [selecionado, lista.data]);
  const ultima = c.data?.mensagens.at(-1)?.id;
  const naoLidas = c.data?.pendentesAdmin ?? 0;
  useEffect(() => {
    if (!selecionado || !ultima || !naoLidas) return;
    let ativo = true;
    void enviar(`/api/admin/suporte/${selecionado}/lida`, "POST", { ate: ultima }).then(() => { if (ativo) { void c.mutate(); void lista.mutate(); void mutate("/api/admin/suporte"); } }).catch(() => { if (ativo) setErro("Não foi possível atualizar a leitura do atendimento."); });
    return () => { ativo = false; };
  }, [selecionado, ultima, naoLidas, c.mutate, lista.mutate, mutate]);
  async function alterarStatus() {
    if (!c.data || !selecionado) return; setErro(""); setOcupado(true);
    try { await enviar(`/api/admin/suporte/${selecionado}`, "PATCH", { encerrada: !c.data.encerrada }); await Promise.all([c.mutate(), lista.mutate()]); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível alterar o atendimento."); }
    finally { setOcupado(false); }
  }
  return <><Cabecalho titulo="Atendimentos" subtitulo="Converse com clientes e interessados no Momint. As respostas são exclusivas do administrador." />
    {erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{erro}</p>}
    <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[300px_minmax(0,1fr)]">
      <section className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="border-b border-slate-100 p-4"><label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Buscar atendimentos por nome ou e-mail" placeholder="Nome ou e-mail" className="min-w-0 flex-1 text-sm outline-none" maxLength={100} value={busca} onChange={e => setBusca(e.target.value)} /></label><p className="mt-2 text-[11px] text-slate-400">Até 100 atendimentos recentes por busca.</p></div><div className="max-h-56 overflow-y-auto lg:max-h-[65dvh]">{lista.isLoading ? <p className="p-5 text-sm text-slate-500">Carregando…</p> : lista.error ? <p role="alert" className="p-5 text-sm text-red-600">Não foi possível carregar os atendimentos. <button className="underline" onClick={() => void lista.mutate()}>Tentar novamente</button></p> : !lista.data?.conversas.length ? <p className="p-6 text-center text-sm text-slate-500">Nenhum atendimento encontrado.</p> : lista.data.conversas.map(r => <button key={r.id} onClick={() => { setSelecionado(r.id); setErro(""); }} className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-blue-50/50 ${r.id === selecionado ? "bg-blue-50" : "bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="break-words text-sm font-semibold text-navy">{r.nome}</span>{r.pendentesAdmin > 0 && <span className="rounded-full bg-acento px-2 text-xs text-white">{r.pendentesAdmin}</span>}</div><div className="mt-1"><Badge tom={r.assunto === "COMERCIAL" ? "verde" : "azul"}>{r.assunto === "COMERCIAL" ? "Interesse comercial" : "Suporte"}</Badge>{r.encerrada && <span className="ml-2 text-[10px] text-slate-400">Encerrado</span>}</div><p className="mt-2 truncate text-xs text-slate-500">{r.mensagens[0]?.conteudo}</p></button>)}</div></section>
      <section className="flex h-[min(700px,75dvh)] min-h-[400px] min-w-0 flex-col">{!selecionado ? <div className="grid flex-1 place-items-center p-8 text-center"><div><MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">Selecione um atendimento para responder.</p></div></div> : c.isLoading ? <p className="p-6 text-sm text-slate-500">Carregando conversa…</p> : c.error ? <p role="alert" className="p-6 text-sm text-red-600">Não foi possível carregar a conversa. <button className="underline" onClick={() => void c.mutate()}>Tentar novamente</button></p> : c.data && <><header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold text-navy">{c.data.nome}</h2><p className="mt-1 break-all text-xs text-slate-500">{c.data.email ? `E-mail informado: ${c.data.email}` : "Visitante sem e-mail informado"}</p></div><Botao disabled={ocupado} variante="secundario" onClick={() => void alterarStatus()}>{c.data.encerrada ? "Reabrir atendimento" : "Encerrar atendimento"}</Botao></header><MensagensSuporte mensagens={c.mensagens} leitor="ADMIN" temMais={c.temMais} carregarMais={() => void c.carregarAnteriores()} carregandoMais={c.carregandoMais} erro={c.erroAnteriores} /><FormMensagem key={selecionado} enviar={async (conteudo, idEnvio) => { await enviar(`/api/admin/suporte/${selecionado}/mensagens`, "POST", { conteudo, idEnvio }); await Promise.all([c.mutate(), lista.mutate(), mutate("/api/admin/suporte"), mutate(CHAVE_NOTIFICACOES_ADMIN)]); }} /></>}</section>
    </div>
  </>;
}
