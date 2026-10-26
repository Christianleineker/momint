"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Check, Inbox, Mail, MessageCircle, Pencil, Sparkles, X, Zap } from "lucide-react";
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

function CartaoMensagem({ m, aoMudar }: { m: MensagemFila; aoMudar: () => Promise<unknown> }) {
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

  const contato = m.contato ? [m.contato.nome, m.contato.cargo].filter(Boolean).join(" · ") : "";
  const destino = m.canal === "EMAIL" ? m.contato?.email : m.contato?.telefone;
  const email = m.canal === "EMAIL";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-navy">{m.lead.empresa}</h3>
            <Badge tom={PRIORIDADE_TOM[m.lead.prioridade]}>{PRIORIDADE_ROTULO[m.lead.prioridade] ?? m.lead.prioridade}</Badge>
          </div>
          <p className="text-sm text-slate-500">{contato || "Sem contato definido"}{destino ? ` · ${destino}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tom="cinza">
            {email ? <Mail className="mr-1 h-3 w-3" /> : <MessageCircle className="mr-1 h-3 w-3" />}
            {email ? "E-mail" : "WhatsApp"}
          </Badge>
          {m.geradaPorIA && (
            <Badge tom="roxo">
              <Sparkles className="mr-1 h-3 w-3" /> Gerada por IA
            </Badge>
          )}
        </div>
      </div>

      <div className="my-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <Zap className="h-4 w-4 shrink-0" />
        <Badge tom={FONTE_TOM[m.gatilho.codigo]}>{FONTE_ROTULO[m.gatilho.codigo] ?? m.gatilho.codigo}</Badge>
        {m.gatilho.resumo}
      </div>

      {editando ? (
        <div className="space-y-3">
          {email && (
            <label className="block text-sm font-medium text-slate-600">
              Assunto
              <input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 focus:border-acento focus:outline-none"
              />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-600">
            Mensagem
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={10}
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal text-slate-700 focus:border-acento focus:outline-none"
            />
          </label>
        </div>
      ) : (
        <>
          {email && m.assunto && (
            <p className="mb-2 text-sm text-slate-600">
              <span className="font-medium">Assunto:</span> {m.assunto}
            </p>
          )}
          <pre className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-4 font-sans text-sm text-slate-700">{m.conteudo}</pre>
        </>
      )}

      {erro && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        {editando ? (
          <>
            <Botao variante="secundario" disabled={ocupado !== null} onClick={() => setEditando(false)} className="disabled:opacity-60">
              Cancelar
            </Botao>
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

export function AbordagensFila() {
  const router = useRouter();
  const { data: fila, error, isLoading, mutate } = useSWR<MensagemFila[], ErroApi>(CHAVE_FILA, lerJson, { shouldRetryOnError: false });

  useEffect(() => {
    if (error?.status === 401) router.replace("/login");
  }, [error, router]);

  if (isLoading) return <p className="text-slate-500">Carregando fila...</p>;

  if (error) {
    return (
      <Card>
        <p role="alert" className="text-red-700">Não foi possível carregar a fila de aprovação.</p>
        <Botao variante="secundario" className="mt-3" onClick={() => void mutate()}>
          Tentar de novo
        </Botao>
      </Card>
    );
  }

  if (!fila || fila.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <Inbox className="h-10 w-10 text-slate-300" />
        <p className="font-medium text-navy">Nenhuma mensagem aguardando aprovação</p>
        <p className="text-sm text-slate-500">Quando a IA rascunhar novas abordagens, elas aparecem aqui.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {fila.map((m) => (
        <CartaoMensagem key={m.id} m={m} aoMudar={() => mutate()} />
      ))}
    </div>
  );
}
