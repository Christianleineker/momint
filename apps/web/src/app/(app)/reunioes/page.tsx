"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, CalendarDays, CheckCircle2, ChevronDown, Download, Plus, Users } from "lucide-react";
import { Badge, Botao, Cabecalho, Metrica, type Tom } from "@/components/ui";
import { EstadoDados, Vazio } from "@/components/EstadoDados";
import { SeloGatilho } from "@/components/SeloGatilho";
import { diaLocal, formatarDiaSemana, formatarHora } from "@/lib/datas";
import { acao, useApi } from "@/lib/useApi";
import { NovaReuniao, type LeadAgendavel } from "./NovaReuniao";

type Reuniao = {
  id: string;
  inicio: string;
  fim: string;
  status: "AGENDADA" | "REALIZADA" | "CANCELADA" | "NO_SHOW";
  briefing: string;
  vendedor: string | null;
  lead: { id: string; estagio: string; empresa: string; municipio: string; gatilho: string };
};

const STATUS: Record<Reuniao["status"], { rotulo: string; tom: Tom }> = {
  AGENDADA: { rotulo: "Agendada", tom: "azul" },
  REALIZADA: { rotulo: "Realizada", tom: "verde" },
  CANCELADA: { rotulo: "Cancelada", tom: "cinza" },
  NO_SHOW: { rotulo: "Não compareceu", tom: "vermelho" },
};
const GRUPOS = ["Hoje", "Amanhã", "Próximos dias", "Aguardando registro", "Histórico"] as const;
const iniciais = (nome: string) => nome.split(" ").filter(Boolean).map((parte) => parte[0]).slice(0, 2).join("");

function grupoDe(r: Reuniao): (typeof GRUPOS)[number] {
  if (r.status !== "AGENDADA") return "Histórico";
  const dia = diaLocal(r.inicio);
  const hoje = diaLocal(new Date());
  if (dia === hoje) return "Hoje";
  if (dia === diaLocal(new Date(Date.now() + 86_400_000))) return "Amanhã";
  return dia > hoje ? "Próximos dias" : "Aguardando registro";
}

function CartaoReuniao({ r }: { r: Reuniao }) {
  const [ocupado, setOcupado] = useState(false);
  const status = STATUS[r.status];

  async function registrar(novo: Reuniao["status"], sucesso: string) {
    setOcupado(true);
    await acao(`/api/reunioes/${r.id}`, "PATCH", { status: novo }, { sucesso, recarregar: ["/api/reunioes", "/api/dashboard", "/api/leads"] });
    setOcupado(false);
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
          <div className="w-28 shrink-0">
            <p className="text-sm font-semibold tabular-nums text-navy">{formatarHora(r.inicio)}–{formatarHora(r.fim)}</p>
            <p className="text-xs capitalize text-slate-500">{formatarDiaSemana(r.inicio)}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold text-navy">{r.lead.empresa}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>{r.lead.municipio}</span><SeloGatilho codigo={r.lead.gatilho} /></div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">{r.vendedor ? iniciais(r.vendedor) : "—"}</span>
            <span className="text-xs text-slate-600">{r.vendedor ?? "Sem responsável"}</span>
          </div>
          <Badge tom={status.tom}>{status.rotulo}</Badge>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-slate-100 p-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Briefing pré-reunião</p>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{r.briefing}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href={`/leads/${r.lead.id}`} className="text-sm font-medium text-acento hover:underline">Abrir o lead</Link>
            {r.status === "AGENDADA" && (
              <div className="flex flex-wrap gap-2">
                <Botao variante="secundario" disabled={ocupado} onClick={() => void registrar("CANCELADA", "Reunião cancelada.")}>Cancelar</Botao>
                <Botao variante="secundario" disabled={ocupado} onClick={() => void registrar("NO_SHOW", "Registrado: o contato não compareceu.")}>Não compareceu</Botao>
                <Botao disabled={ocupado} onClick={() => void registrar("REALIZADA", "Reunião marcada como realizada.")}><CheckCircle2 aria-hidden="true" className="h-4 w-4" />Marcar realizada</Botao>
              </div>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

export default function ReunioesPage() {
  const { data, error, isLoading, mutate } = useApi<Reuniao[]>("/api/reunioes");
  const leads = useApi<LeadAgendavel[]>("/api/leads");
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const reunioes = data ?? [];

  const agendadas = reunioes.filter((r) => r.status === "AGENDADA").length;
  const realizadas = reunioes.filter((r) => r.status === "REALIZADA").length;
  const faltas = reunioes.filter((r) => r.status === "NO_SHOW").length;
  const mesAtual = diaLocal(new Date()).slice(0, 7);
  const noMes = reunioes.filter((r) => diaLocal(r.inicio).startsWith(mesAtual)).length;
  const comparecimento = realizadas + faltas ? `${Math.round((realizadas / (realizadas + faltas)) * 100)}%` : "—";
  const agendaveis = (leads.data ?? []).filter((l) => ["ENGAJADO", "QUALIFICANDO"].includes(l.estagio));

  const ordenadas = (grupo: (typeof GRUPOS)[number]) => reunioes
    .filter((r) => grupoDe(r) === grupo)
    .sort((a, b) => grupo === "Histórico" ? Date.parse(b.inicio) - Date.parse(a.inicio) : Date.parse(a.inicio) - Date.parse(b.inicio));

  function exportarAgenda() {
    function celula(valor: string) {
      const texto = /^[=+\-@\t\r\n]/.test(valor) ? `'${valor}` : valor;
      return `"${texto.replace(/"/g, '""')}"`;
    }
    const linhas = [["Empresa", "Data e horário", "Responsável", "Status"], ...reunioes.map((r) => [r.lead.empresa, `${formatarDiaSemana(r.inicio)} ${formatarHora(r.inicio)}–${formatarHora(r.fim)}`, r.vendedor ?? "", STATUS[r.status].rotulo])];
    const csv = "﻿" + linhas.map((linha) => linha.map(celula).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "agenda-reunioes.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <Cabecalho titulo="Reuniões" subtitulo="Agenda comercial e briefings pré-reunião." acoes={
        <div className="flex max-w-full flex-wrap gap-3">
          <Botao onClick={() => setAbrirFormulario(true)}><Plus aria-hidden="true" className="h-4 w-4 shrink-0" />Nova reunião</Botao>
          <Botao variante="secundario" disabled={!reunioes.length} onClick={exportarAgenda}><Download aria-hidden="true" className="h-4 w-4 shrink-0" />Exportar agenda</Botao>
        </div>
      } />
      <EstadoDados erro={error} carregando={isLoading} tentar={mutate} texto="Carregando a agenda..." />
      {data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica icone={CalendarDays} rotulo="Agendadas" valor={String(agendadas)} tom="azul" />
            <Metrica icone={CheckCircle2} rotulo="Realizadas" valor={String(realizadas)} tom="verde" />
            <Metrica icone={Users} rotulo="Taxa de comparecimento" valor={comparecimento} detalhe="realizadas sobre realizadas e faltas" tom="roxo" />
            <Metrica icone={CalendarCheck} rotulo="Reuniões no mês" valor={String(noMes)} tom="azul" />
          </div>
          {!reunioes.length && <Vazio icone={CalendarDays} titulo="Nenhuma reunião ainda" texto="Agende uma reunião com um lead qualificado." acao={<Botao onClick={() => setAbrirFormulario(true)}><Plus className="h-4 w-4" />Nova reunião</Botao>} />}
          <div className="space-y-6">
            {GRUPOS.map((grupo) => {
              const itens = ordenadas(grupo);
              if (!itens.length) return null;
              return (
                <section key={grupo} aria-label={grupo} className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{grupo} <span className="ml-1 text-slate-400">· {itens.length}</span></h2>
                  <ul className="space-y-3">{itens.map((r) => <CartaoReuniao key={r.id} r={r} />)}</ul>
                </section>
              );
            })}
          </div>
        </>
      )}
      {abrirFormulario && <NovaReuniao leads={agendaveis} onFechar={() => setAbrirFormulario(false)} />}
    </>
  );
}
