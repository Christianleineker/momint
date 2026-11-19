"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Check, Inbox, Mail, MessageCircle, Pencil, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { Badge, Botao, Card, FONTE_ROTULO, FONTE_TOM, PRIORIDADE_ROTULO, PRIORIDADE_TOM } from "@/components/ui";
import { CHAVE_FILA, ErroApi, enviar, lerJson } from "@/lib/api";

type MensagemFila = {
  id: string;
  canal: "EMAIL" | "WHATSAPP";
  assunto: string | null;
  conteudo: string;
  geradaPorIA: boolean;
  contato: { nome: string | null; cargo: string | null; email: string | null; telefone: string | null } | null;
  lead: { id: string; empresa: string; prioridade: string };
  gatilho: { codigo: string; resumo: string };
};

type Acao = "aprovar" | "rejeitar" | "salvar";

/** Destaca no corpo o trecho que cita o gatilho, com a etiqueta "cita o gatilho". */
function destacarGatilho(texto: string, trecho: string) {
  const posicao = trecho ? texto.indexOf(trecho) : -1;
  if (posicao < 0) return texto;
  return (
    <>
      {texto.slice(0, posicao)}
      <mark className="rounded bg-teal/15 px-1 text-navy">
        {trecho}
        <span className="ml-1.5 rounded bg-teal px-1 align-middle text-[10px] font-semibold uppercase tracking-wide text-white">cita o gatilho</span>
      </mark>
      {texto.slice(posicao + trecho.length)}
    </>
  );
}

function PreviaMensagem({ m, remetente, aoMudar }: { m: MensagemFila; remetente: string; aoMudar: () => Promise<unknown> }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [ocupado, setOcupado] = useState<Acao | null>(null);
  const [erro, setErro] = useState("");

  async function executar(acao: Acao, tarefa: () => Promise<unknown>) {
    setOcupado(acao);
    setErro("");
    try {
      await tarefa();
      await aoMudar();
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        router.replace("/login");
        return;
      }
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setOcupado(null);
    }
  }

  function iniciarEdicao() {
    setAssunto(m.assunto ?? "");
    setConteudo(m.conteudo);
    setErro("");
    setEditando(true);
  }

  function salvar() {
    if (!conteudo.trim()) {
      setErro("A mensagem não pode ficar vazia.");
      return;
    }
    void executar("salvar", async () => {
      await enviar(`/api/mensagens/${m.id}`, "PUT", { assunto: m.canal === "EMAIL" ? assunto : undefined, conteudo });
      setEditando(false);
    });
  }

  function aprovar() {
    void executar("aprovar", () => enviar(`/api/mensagens/${m.id}/aprovar`, "POST"));
  }

  function rejeitar() {
    if (!window.confirm(`Rejeitar a mensagem para ${m.lead.empresa}?`)) return;
    void executar("rejeitar", () => enviar(`/api/mensagens/${m.id}/rejeitar`, "POST"));
  }

  const email = m.canal === "EMAIL";
  const destino = (email ? m.contato?.email : m.contato?.telefone) ?? "";
  const para = [m.contato?.nome, destino].filter(Boolean).join(" · ") || "Sem destinatário definido";
  const rotuloCampo = "inline-block w-20 shrink-0 text-slate-500";

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-navy">{m.lead.empresa}</h2>
          <Badge tom={PRIORIDADE_TOM[m.lead.prioridade]}>{PRIORIDADE_ROTULO[m.lead.prioridade] ?? m.lead.prioridade}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge tom="cinza">
            {email ? <Mail aria-hidden="true" className="mr-1 h-3 w-3" /> : <MessageCircle aria-hidden="true" className="mr-1 h-3 w-3" />}
            {email ? "E-mail" : "WhatsApp"}
          </Badge>
          {m.geradaPorIA && <Badge tom="roxo"><Sparkles aria-hidden="true" className="mr-1 h-3 w-3" />Gerada por IA</Badge>}
        </div>
      </div>

      <div className="space-y-1.5 border-y border-slate-100 bg-slate-50 px-5 py-4 text-sm">
        <p><span className={rotuloCampo}>De</span><span className="text-slate-800">{remetente}</span></p>
        <p><span className={rotuloCampo}>Para</span><span className="text-slate-800">{para}</span></p>
        {email && <p><span className={rotuloCampo}>Assunto</span><span className="font-medium text-navy">{m.assunto ?? "Sem assunto"}</span></p>}
        <p className="flex flex-wrap items-center gap-2 pt-1 text-slate-600"><Zap aria-hidden="true" className="h-4 w-4 text-teal" /><Badge tom={FONTE_TOM[m.gatilho.codigo]}>{FONTE_ROTULO[m.gatilho.codigo] ?? m.gatilho.codigo}</Badge>{m.gatilho.resumo}</p>
      </div>

      <div className="px-5 py-5">
        {editando ? (
          <div className="space-y-3">
            {email && (
              <label className="block text-sm font-medium text-slate-600">
                Assunto
                <input value={assunto} onChange={(e) => setAssunto(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 focus:border-acento focus:outline-none" />
              </label>
            )}
            <label className="block text-sm font-medium text-slate-600">
              Mensagem
              <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={10} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal leading-6 text-slate-700 focus:border-acento focus:outline-none" />
            </label>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">{destacarGatilho(m.conteudo, m.gatilho.resumo)}</pre>
        )}
        {erro && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
        {editando ? (
          <>
            <Botao variante="secundario" disabled={ocupado !== null} onClick={() => setEditando(false)} className="disabled:opacity-60">Cancelar</Botao>
            <Botao disabled={ocupado !== null} onClick={salvar} className="disabled:opacity-60">
              <Check className="h-4 w-4" /> {ocupado === "salvar" ? "Salvando..." : "Salvar alterações"}
            </Botao>
          </>
        ) : (
          <>
            <Botao variante="perigo" disabled={ocupado !== null} onClick={rejeitar} className="disabled:opacity-60">
              <X className="h-4 w-4" /> {ocupado === "rejeitar" ? "Rejeitando..." : "Rejeitar"}
            </Botao>
            <Botao variante="secundario" disabled={ocupado !== null} onClick={iniciarEdicao} className="disabled:opacity-60">
              <Pencil className="h-4 w-4" /> Editar
            </Botao>
            <Botao disabled={ocupado !== null} onClick={aprovar} className="disabled:opacity-60">
              <Check className="h-4 w-4" /> {ocupado === "aprovar" ? "Enviando..." : "Aprovar e enviar"}
            </Botao>
          </>
        )}
      </div>
    </Card>
  );
}

export function AbordagensFila({ remetente }: { remetente: string }) {
  const router = useRouter();
  const { data: fila, error, isLoading, mutate } = useSWR<MensagemFila[], ErroApi>(CHAVE_FILA, lerJson, { shouldRetryOnError: false });
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  useEffect(() => {
    if (error?.status === 401) router.replace("/login");
  }, [error, router]);

  if (isLoading) return <p className="text-slate-500">Carregando fila...</p>;

  if (error) {
    return (
      <Card>
        <p role="alert" className="text-red-700">Não foi possível carregar a fila de aprovação.</p>
        <Botao variante="secundario" className="mt-3" onClick={() => void mutate()}>Tentar de novo</Botao>
      </Card>
    );
  }

  if (!fila || fila.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <Inbox aria-hidden="true" className="h-10 w-10 text-slate-300" />
        <p className="font-medium text-navy">Nenhuma mensagem aguardando aprovação</p>
        <p className="text-sm text-slate-500">Quando a IA rascunhar novas abordagens, elas aparecem aqui.</p>
      </Card>
    );
  }

  const selecionado = fila.find((m) => m.id === selecionadoId) ?? fila[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{fila.length} {fila.length === 1 ? "aguardando" : "aguardando"} aprovação</p>
        {fila.map((m) => {
          const ativo = m.id === selecionado.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => setSelecionadoId(m.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${ativo ? "border-acento bg-blue-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-navy">{m.lead.empresa}</p>
                <Badge tom={PRIORIDADE_TOM[m.lead.prioridade]}>{PRIORIDADE_ROTULO[m.lead.prioridade] ?? m.lead.prioridade}</Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">{m.contato?.nome ?? "Sem contato definido"}{m.contato?.cargo ? ` · ${m.contato.cargo}` : ""}</p>
              <div className="mt-2"><Badge tom={FONTE_TOM[m.gatilho.codigo]}>{FONTE_ROTULO[m.gatilho.codigo] ?? m.gatilho.codigo}</Badge></div>
            </button>
          );
        })}
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />Modo Copiloto — nenhuma mensagem sai sem aprovação
        </div>
        <PreviaMensagem key={selecionado.id} m={selecionado} remetente={remetente} aoMudar={() => mutate()} />
      </div>
    </div>
  );
}
