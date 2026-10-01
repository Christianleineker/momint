"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChartNoAxesColumnIncreasing, CheckCircle2, ChevronDown, Download, Plus, Users } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, Metrica } from "@/components/ui";
import { NovaReuniao } from "./NovaReuniao";
import type { Agendamento } from "./NovaReuniao";

const CHAVE = "momint:reunioes-agendadas:v1";
// Resumo de demonstração; novos agendamentos locais são somados à agenda.
const RESUMO_DEMO = { agendadas: 32, confirmadas: 24, realizadas: 18, comparecimento: "75%" };

function agendamentoValido(valor: unknown): valor is Agendamento {
  if (!valor || typeof valor !== "object") return false;
  const r = valor as Record<string, unknown>;
  return ["id", "empresa", "vendedor"].every((campo) => typeof r[campo] === "string")
    && typeof r.inicio === "string" && Number.isFinite(Date.parse(r.inicio))
    && typeof r.duracaoMin === "number" && Number.isInteger(r.duracaoMin) && r.duracaoMin >= 15 && r.duracaoMin <= 240
    && typeof r.confirmada === "boolean";
}

function quando(reuniao: Agendamento) {
  const inicio = new Date(reuniao.inicio);
  const fim = new Date(inicio.getTime() + reuniao.duracaoMin * 60_000);
  const data = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return `${data.format(inicio)} · ${hora.format(inicio)}–${hora.format(fim)}`;
}

// TODO: GET /api/reunioes + PATCH status + expandir briefing
const REUNIOES = [
  { empresa: "Monteiro Engenharia", quando: "Sex, 02/10 · 14:00–14:45", vendedor: "Rafael Nunes", status: "Agendada", tom: "azul" as const },
  { empresa: "Cota Zero Engenharia", quando: "Qui, 24/09 · 10:00–11:00", vendedor: "Carla Dias", status: "Realizada", tom: "verde" as const },
  { empresa: "Nova Base Construções", quando: "Qui, 10/09 · 11:00–11:45", vendedor: "Rafael Nunes", status: "Realizada", tom: "verde" as const },
];

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

  const agenda = [
    ...novas.slice().sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio)).map((r) => ({ id: r.id, empresa: r.empresa, quando: quando(r), vendedor: r.vendedor, status: r.confirmada ? "Confirmada" : "Agendada", tom: r.confirmada ? "verde" as const : "azul" as const })),
    ...REUNIOES.map((r, i) => ({ ...r, id: `demo-${i}` })),
  ];

  function exportarAgenda() {
    function celula(valor: string) {
      const texto = /^[=+\-@\t\r\n]/.test(valor) ? `'${valor}` : valor;
      return `"${texto.replace(/"/g, '""')}"`;
    }
    const linhas = [["Empresa", "Data e horário", "Responsável", "Status"], ...agenda.map((r) => [r.empresa, r.quando, r.vendedor, r.status])];
    const csv = "\uFEFF" + linhas.map((linha) => linha.map(celula).join(";")).join("\r\n");
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
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metrica icone={CalendarDays} rotulo="Reuniões agendadas" valor={carregado ? String(RESUMO_DEMO.agendadas + novas.length) : "..."} tom="azul" />
        <Metrica icone={CheckCircle2} rotulo="Confirmadas" valor={carregado ? String(RESUMO_DEMO.confirmadas + novas.filter((r) => r.confirmada).length) : "..."} tom="verde" />
        <Metrica icone={ChartNoAxesColumnIncreasing} rotulo="Realizadas" valor={String(RESUMO_DEMO.realizadas)} tom="azul" />
        <Metrica icone={Users} rotulo="Taxa de comparecimento" valor={RESUMO_DEMO.comparecimento} tom="roxo" />
      </div>
      {aviso && <p role="status" className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{aviso}</p>}
      <Card>
        <ul className="divide-y divide-slate-100">
          {agenda.map((r) => (
            <li key={r.id} className="py-4">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-navy">{r.empresa}</p>
                    <p className="text-sm text-slate-500">{r.quando} · {r.vendedor}</p>
                  </div>
                  <Badge tom={r.tom}>{r.status}</Badge>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </summary>
                <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Briefing pré-reunião: empresa, por que agora, qualificação e pauta sugerida.</div>
              </details>
            </li>
          ))}
        </ul>
      </Card>
      {abrirFormulario && <NovaReuniao onFechar={() => setAbrirFormulario(false)} onSalvar={(reuniao) => {
        setNovas((lista) => [...lista, reuniao]);
        setAviso("Reunião agendada.");
        setAbrirFormulario(false);
      }} />}
    </>
  );
}
