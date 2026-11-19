"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChartNoAxesColumnIncreasing, CheckCircle2, ChevronDown, Download, Plus, Users } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, Metrica } from "@/components/ui";
import { NovaReuniao } from "./NovaReuniao";
import type { Agendamento } from "./NovaReuniao";

const CHAVE = "momint:reunioes-agendadas:v1";
// Resumo de demonstração; novos agendamentos locais são somados à agenda.
const RESUMO_DEMO = { agendadas: 32, confirmadas: 24, realizadas: 18, comparecimento: "75%" };
const GRUPOS = ["Hoje", "Amanhã", "Próximos dias", "Anteriores", "Realizadas"] as const;

type Briefing = { gatilho: string; resumo: string; criterios: string[] };
type Item = { id: string; empresa: string; quando: string; vendedor: string; status: string; tom: "azul" | "verde"; grupo: (typeof GRUPOS)[number]; briefing?: Briefing };

function agendamentoValido(valor: unknown): valor is Agendamento {
  if (!valor || typeof valor !== "object") return false;
  const r = valor as Record<string, unknown>;
  return ["id", "empresa", "vendedor"].every((campo) => typeof r[campo] === "string")
    && typeof r.inicio === "string" && Number.isFinite(Date.parse(r.inicio))
    && typeof r.duracaoMin === "number" && Number.isInteger(r.duracaoMin) && r.duracaoMin >= 15 && r.duracaoMin <= 240
    && typeof r.confirmada === "boolean";
}

const diaLocal = (data: Date) => data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function grupoDe(inicio: string): Item["grupo"] {
  const dia = diaLocal(new Date(inicio));
  const hoje = diaLocal(new Date());
  if (dia === hoje) return "Hoje";
  if (dia === diaLocal(new Date(Date.now() + 86_400_000))) return "Amanhã";
  return dia > hoje ? "Próximos dias" : "Anteriores";
}

function quando(reuniao: Agendamento) {
  const inicio = new Date(reuniao.inicio);
  const fim = new Date(inicio.getTime() + reuniao.duracaoMin * 60_000);
  const data = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return `${data.format(inicio)} · ${hora.format(inicio)}–${hora.format(fim)}`;
}

// TODO: GET /api/reunioes + PATCH status + briefing vindo da API
const REUNIOES_DEMO: Item[] = [
  {
    id: "demo-0", empresa: "Monteiro Engenharia", quando: "Sex, 02/10 · 14:00–14:45", vendedor: "Rafael Nunes", status: "Agendada", tom: "azul", grupo: "Próximos dias",
    briefing: { gatilho: "Nova obra no CNO: corporativo de 15.200 m² no Batel (Curitiba), detectada em 20/08/2026.", resumo: "Construção de edifícios em Curitiba/PR. CNPJ 10.111.***/0001-90.", criterios: ["Necessidade", "Momento", "Encaixe"] },
  },
  { id: "demo-1", empresa: "Cota Zero Engenharia", quando: "Qui, 24/09 · 10:00–11:00", vendedor: "Carla Dias", status: "Realizada", tom: "verde", grupo: "Realizadas" },
  { id: "demo-2", empresa: "Nova Base Construções", quando: "Qui, 10/09 · 11:00–11:45", vendedor: "Rafael Nunes", status: "Realizada", tom: "verde", grupo: "Realizadas" },
];

const iniciais = (nome: string) => nome.split(" ").map((parte) => parte[0]).slice(0, 2).join("");

function CartaoReuniao({ r }: { r: Item }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold text-navy">{r.empresa}</p>
            <p className="mt-0.5 text-sm tabular-nums text-slate-500">{r.quando}</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">{iniciais(r.vendedor)}</span>
            <span className="text-xs text-slate-600">{r.vendedor}</span>
          </div>
          <Badge tom={r.tom}>{r.status}</Badge>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-100 p-4">
          {r.briefing ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gatilho de origem</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{r.briefing.gatilho}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resumo da empresa</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{r.briefing.resumo}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Critérios confirmados</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.briefing.criterios.map((criterio) => <span key={criterio} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{criterio}</span>)}
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">O briefing aparece aqui quando a reunião estiver vinculada a um lead.</p>
          )}
        </div>
      </details>
    </li>
  );
}

export default function ReunioesPage() {
  const [novas, setNovas] = useState<Agendamento[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    try {
      const salvas: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
      if (Array.isArray(salvas) && salvas.every(agendamentoValido) && new Set(salvas.map((r) => r.id)).size === salvas.length) setNovas(salvas);
      else setAviso("Não foi possível recuperar os agendamentos salvos.");
    } catch { setAviso("Não foi possível recuperar os agendamentos salvos."); }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(novas)); }
    catch { setAviso("Os agendamentos estão disponíveis nesta sessão, mas não puderam ser salvos no navegador."); }
  }, [novas, carregado]);

  const agenda: Item[] = [
    ...novas.slice().sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio)).map((r) => ({ id: r.id, empresa: r.empresa, quando: quando(r), vendedor: r.vendedor, status: r.confirmada ? "Confirmada" : "Agendada", tom: r.confirmada ? "verde" as const : "azul" as const, grupo: grupoDe(r.inicio) })),
    ...REUNIOES_DEMO,
  ];

  function exportarAgenda() {
    function celula(valor: string) {
      const texto = /^[=+\-@\t\r\n]/.test(valor) ? `'${valor}` : valor;
      return `"${texto.replace(/"/g, '""')}"`;
    }
    const linhas = [["Empresa", "Data e horário", "Responsável", "Status"], ...agenda.map((r) => [r.empresa, r.quando, r.vendedor, r.status])];
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
          <Botao disabled={!carregado} onClick={() => setAbrirFormulario(true)}><Plus aria-hidden="true" className="h-4 w-4 shrink-0" />Nova reunião</Botao>
          <Botao variante="secundario" disabled={!carregado} onClick={exportarAgenda}><Download aria-hidden="true" className="h-4 w-4 shrink-0" />Exportar agenda</Botao>
        </div>
      } />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica icone={CalendarDays} rotulo="Reuniões agendadas" valor={carregado ? String(RESUMO_DEMO.agendadas + novas.length) : "..."} tom="azul" />
        <Metrica icone={CheckCircle2} rotulo="Confirmadas" valor={carregado ? String(RESUMO_DEMO.confirmadas + novas.filter((r) => r.confirmada).length) : "..."} tom="verde" />
        <Metrica icone={ChartNoAxesColumnIncreasing} rotulo="Realizadas" valor={String(RESUMO_DEMO.realizadas)} tom="azul" />
        <Metrica icone={Users} rotulo="Taxa de comparecimento" valor={RESUMO_DEMO.comparecimento} tom="roxo" />
      </div>
      {aviso && <p role="status" className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{aviso}</p>}
      <div className="space-y-6">
        {GRUPOS.map((grupo) => {
          const itens = agenda.filter((r) => r.grupo === grupo);
          if (!itens.length) return null;
          return (
            <section key={grupo} aria-label={grupo} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{grupo} <span className="ml-1 text-slate-400">· {itens.length}</span></h2>
              <ul className="space-y-3">{itens.map((r) => <CartaoReuniao key={r.id} r={r} />)}</ul>
            </section>
          );
        })}
        {agenda.length === 0 && (
          <Card className="flex flex-col items-center gap-2 py-12 text-center">
            <CalendarDays aria-hidden="true" className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-navy">Nenhuma reunião agendada</p>
            <p className="text-sm text-slate-500">Agende uma reunião com um lead qualificado.</p>
          </Card>
        )}
      </div>
      {abrirFormulario && <NovaReuniao onFechar={() => setAbrirFormulario(false)} onSalvar={(reuniao) => {
        setNovas((lista) => [...lista, reuniao]);
        setAviso("Reunião agendada.");
        setAbrirFormulario(false);
      }} />}
    </>
  );
}
