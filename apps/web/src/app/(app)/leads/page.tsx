"use client";

import Link from "next/link";
import { useState } from "react";
import { Columns3, Filter, List } from "lucide-react";
import { Badge, Botao, Cabecalho } from "@/components/ui";
import { EstadoDados, Vazio } from "@/components/EstadoDados";
import { SeloGatilho, SeloPrioridade } from "@/components/SeloGatilho";
import { COLUNAS_KANBAN, rotuloEstagio, tomEstagio } from "@/lib/estagios";
import { useApi } from "@/lib/useApi";

type Lead = {
  id: string;
  estagio: string;
  score: number;
  prioridade: string;
  empresa: { nome: string; municipio: string };
  gatilho: { codigo: string };
  gatilhosAtivos: string[];
  dono: { nome: string } | null;
};

function CartaoLead({ l }: { l: Lead }) {
  return (
    <Link href={`/leads/${l.id}`} draggable className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-acento/40 hover:shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-5 text-navy">{l.empresa.nome}</p>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-navy" title="Score de prioridade">{Math.round(l.score)}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{l.empresa.municipio}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <SeloGatilho codigo={l.gatilho.codigo} />
        {l.gatilhosAtivos.length >= 2 && <Badge tom="vermelho">{l.gatilhosAtivos.length} gatilhos</Badge>}
        <SeloPrioridade prioridade={l.prioridade} />
      </div>
      <p className="mt-2 truncate text-xs text-slate-500">{l.dono?.nome ?? "Sem responsável"}</p>
    </Link>
  );
}

export default function LeadsPage() {
  const { data, error, isLoading, mutate } = useApi<Lead[]>("/api/leads");
  const [modo, setModo] = useState<"kanban" | "lista">("kanban");
  const leads = data ?? [];
  const colunas = [
    ...COLUNAS_KANBAN.map((estagio) => ({ chave: estagio, titulo: rotuloEstagio(estagio), leads: leads.filter((l) => l.estagio === estagio) })),
    { chave: "ENCERRADOS", titulo: "Encerrados", leads: leads.filter((l) => !COLUNAS_KANBAN.includes(l.estagio)) },
  ];

  return (
    <>
      <Cabecalho
        titulo="Leads"
        subtitulo={data ? `${leads.length} leads no funil da prospecção.` : "Pipeline dos leads pelas etapas da prospecção."}
        acoes={
          <>
            <Botao variante={modo === "lista" ? "primario" : "secundario"} aria-pressed={modo === "lista"} onClick={() => setModo("lista")}><List className="h-4 w-4" /> Lista</Botao>
            <Botao variante={modo === "kanban" ? "primario" : "secundario"} aria-pressed={modo === "kanban"} onClick={() => setModo("kanban")}><Columns3 className="h-4 w-4" /> Kanban</Botao>
          </>
        }
      />
      <EstadoDados erro={error} carregando={isLoading} tentar={mutate} texto="Carregando leads..." />
      {data && !leads.length && <Vazio icone={Filter} titulo="Nenhum lead ainda" texto="Configure a segmentação para o radar encontrar empresas com gatilhos." />}

      {data && leads.length > 0 && modo === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {colunas.map((c) => (
            <div key={c.chave} className="flex w-64 shrink-0 flex-col rounded-xl bg-slate-100/70 p-3">
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-semibold text-navy">{c.titulo}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 shadow-sm">{c.leads.length}</span>
              </div>
              <div className="space-y-2">
                {c.leads.map((l) => <CartaoLead key={l.id} l={l} />)}
                {c.leads.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">Nenhum lead nesta etapa</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && leads.length > 0 && modo === "lista" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Empresa</th>
                <th scope="col" className="px-4 py-3 font-medium">Estágio</th>
                <th scope="col" className="px-4 py-3 font-medium">Gatilho</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Score</th>
                <th scope="col" className="px-4 py-3 font-medium">Prioridade</th>
                <th scope="col" className="px-4 py-3 font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...leads].sort((a, b) => b.score - a.score).map((l) => (
                <tr key={l.id} className="transition hover:bg-blue-50/40">
                  <td className="px-4 py-3"><Link href={`/leads/${l.id}`} className="font-semibold text-navy hover:text-acento">{l.empresa.nome}</Link><p className="text-xs text-slate-500">{l.empresa.municipio}</p></td>
                  <td className="px-4 py-3"><Badge tom={tomEstagio(l.estagio)}>{rotuloEstagio(l.estagio)}</Badge></td>
                  <td className="px-4 py-3"><SeloGatilho codigo={l.gatilho.codigo} /></td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy">{Math.round(l.score)}</td>
                  <td className="px-4 py-3"><SeloPrioridade prioridade={l.prioridade} /></td>
                  <td className="px-4 py-3 text-slate-600">{l.dono?.nome ?? "Sem responsável"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
