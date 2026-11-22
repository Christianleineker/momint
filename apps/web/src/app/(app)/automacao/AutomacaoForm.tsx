"use client";

import { useState } from "react";
import { Bot, Mail, MessageCircle, Plus, Save, ShieldCheck, StopCircle, Trash2 } from "lucide-react";
import { Botao, Cabecalho, Card, CardTitulo } from "@/components/ui";
import { EstadoDados, Vazio } from "@/components/EstadoDados";
import { acao, useApi } from "@/lib/useApi";

type Passo = { dia: number; canal: "EMAIL" | "WHATSAPP"; titulo: string };
type Cadencia = { modoOperacao: "COPILOTO" | "AUTOPILOT"; condicoesParada: string[]; passos: Passo[] };

const PARADAS = [{ id: "RESPONDEU", nome: "Lead respondeu" }, { id: "OPT_OUT", nome: "Contato pediu remoção" }, { id: "REUNIAO_MARCADA", nome: "Reunião marcada" }];
const campo = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

function Formulario({ dados, podeGerir }: { dados: Cadencia; podeGerir: boolean }) {
  const [cadencia, setCadencia] = useState<Cadencia>(dados);
  const [salvando, setSalvando] = useState(false);
  const passos = cadencia.passos;
  const mudarPasso = (indice: number, parcial: Partial<Passo>) => setCadencia((atual) => ({ ...atual, passos: atual.passos.map((p, i) => (i === indice ? { ...p, ...parcial } : p)) }));

  async function salvar() {
    if (!passos.length) { return; }
    setSalvando(true);
    await acao("/api/cadencia", "PUT", { ...cadencia, passos: [...passos].sort((a, b) => a.dia - b.dia) }, { sucesso: "Cadência salva.", recarregar: ["/api/cadencia", "/api/configuracoes"] });
    setSalvando(false);
  }

  return (
    <>
      <Cabecalho titulo="Automação" subtitulo="Cadência de contato por canal e modo de operação." acoes={podeGerir && <Botao disabled={salvando || !passos.length} onClick={() => void salvar()}><Save aria-hidden="true" className="h-4 w-4" /> {salvando ? "Salvando..." : "Salvar"}</Botao>} />
      {!podeGerir && <p className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">Somente gestores podem alterar a cadência. Você está vendo a configuração atual.</p>}
      <fieldset disabled={!podeGerir || salvando} className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitulo icone={Bot} titulo="Passos da cadência" subtitulo="Dias contados a partir da primeira abordagem." extra={podeGerir && <Botao type="button" variante="secundario" onClick={() => setCadencia((atual) => ({ ...atual, passos: [...atual.passos, { dia: atual.passos.length ? Math.min(60, atual.passos[atual.passos.length - 1].dia + 2) : 0, canal: "EMAIL", titulo: "" }] }))}><Plus className="h-4 w-4" /> Passo</Botao>} />
          {!passos.length && <Vazio icone={Bot} titulo="Nenhum passo configurado" texto="Adicione o primeiro contato da sua cadência." />}
          <ol className="space-y-3">
            {passos.map((p, i) => (
              <li key={i} className="grid items-center gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[96px_150px_minmax(0,1fr)_auto]">
                <label className="flex items-center gap-2 text-sm font-semibold text-navy">Dia<input aria-label={`Dia do passo ${i + 1}`} type="number" min={0} max={60} required value={p.dia} onChange={(e) => mudarPasso(i, { dia: Number(e.target.value) })} className={`${campo} w-16 tabular-nums`} /></label>
                <div className="flex items-center gap-2">
                  {p.canal === "EMAIL" ? <Mail aria-hidden="true" className="h-5 w-5 shrink-0 text-acento" /> : <MessageCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-600" />}
                  <select aria-label={`Canal do passo ${i + 1}`} value={p.canal} onChange={(e) => mudarPasso(i, { canal: e.target.value as Passo["canal"] })} className={campo}><option value="EMAIL">E-mail</option><option value="WHATSAPP">WhatsApp</option></select>
                </div>
                <input aria-label={`Descrição do passo ${i + 1}`} required value={p.titulo} placeholder="Descreva o contato" onChange={(e) => mudarPasso(i, { titulo: e.target.value })} className={campo} />
                {podeGerir && <button type="button" aria-label={`Remover passo ${i + 1}`} title="Remover passo" onClick={() => setCadencia((atual) => ({ ...atual, passos: atual.passos.filter((_, j) => j !== i) }))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>}
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitulo icone={ShieldCheck} titulo="Modo de operação" />
            {([["COPILOTO", "Copiloto (padrão)", "Toda mensagem passa pela fila de aprovação."], ["AUTOPILOT", "Autopilot", "Envia sem revisão humana."]] as const).map(([modo, titulo, texto]) => (
              <label key={modo} className={`mt-2 flex cursor-pointer items-start gap-3 rounded-xl border p-3 first:mt-0 ${cadencia.modoOperacao === modo ? "border-acento bg-blue-50/50" : "border-slate-200"}`}>
                <input type="radio" name="modo" checked={cadencia.modoOperacao === modo} onChange={() => setCadencia((atual) => ({ ...atual, modoOperacao: modo }))} className="mt-1 accent-blue-600" />
                <span className="text-sm"><b className="text-navy">{titulo}</b><br /><span className="text-xs text-slate-500">{texto}</span></span>
              </label>
            ))}
          </Card>
          <Card>
            <CardTitulo icone={StopCircle} titulo="Condições de parada" subtitulo="A cadência para quando:" />
            {PARADAS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={cadencia.condicoesParada.includes(p.id)} onChange={() => setCadencia((atual) => ({ ...atual, condicoesParada: atual.condicoesParada.includes(p.id) ? atual.condicoesParada.filter((c) => c !== p.id) : [...atual.condicoesParada, p.id] }))} className="h-4 w-4 accent-blue-600" /> {p.nome}</label>
            ))}
          </Card>
        </div>
      </fieldset>
    </>
  );
}

export function AutomacaoForm({ podeGerir }: { podeGerir: boolean }) {
  const { data, error, isLoading, mutate } = useApi<Cadencia>("/api/cadencia");
  if (!data) {
    return (
      <>
        <Cabecalho titulo="Automação" subtitulo="Cadência de contato por canal e modo de operação." />
        <EstadoDados erro={error} carregando={isLoading} tentar={mutate} texto="Carregando a cadência..." />
      </>
    );
  }
  return <Formulario dados={data} podeGerir={podeGerir} />;
}
