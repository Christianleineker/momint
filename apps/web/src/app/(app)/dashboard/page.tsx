import { CalendarCheck, CheckCircle2, Clock, Flame, Handshake, TrendingUp, Users } from "lucide-react";
import { Badge, Cabecalho, Card, CardTitulo, Esboco, FONTE_ROTULO, FONTE_TOM, Metrica } from "@/components/ui";

// TODO: substituir por GET /api/dashboard
const ESTAGIOS = [
  ["Apto a abordar", 1], ["Aguardando aprovação", 4], ["Em cadência", 1], ["Engajado", 1],
  ["Qualificando", 1], ["Reunião marcada", 1], ["Reunião realizada", 2], ["Ganho", 9],
] as const;
const ULTIMOS = [
  { empresa: "Prisma Incorporadora", gatilho: "PNCP", estagio: "Aguardando aprovação" },
  { empresa: "Construtora Horizonte", gatilho: "CNO", estagio: "Aguardando aprovação" },
  { empresa: "Alicerce Obras", gatilho: "CNPJ_NOVO", estagio: "Aguardando aprovação" },
  { empresa: "Bauen Construções", gatilho: "CNO", estagio: "Apto a abordar" },
];

export default function DashboardPage() {
  const max = Math.max(...ESTAGIOS.map(([, n]) => n));
  return (
    <>
      <Cabecalho titulo="Dashboard" subtitulo="Acompanhe o desempenho da sua operação em tempo real." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metrica icone={Handshake} rotulo="Reunião → Negócio" valor="45%" detalhe="9 de 20 reuniões" tom="verde" destaque />
        <Metrica icone={CalendarCheck} rotulo="Reuniões marcadas (mês)" valor="3" tom="azul" />
        <Metrica icone={Flame} rotulo="Respostas quentes" valor="5" detalhe="últimos 30 dias" tom="vermelho" />
        <Metrica icone={CheckCircle2} rotulo="Aprovações pendentes" valor="4" tom="roxo" />
      </div>

      <Card className="mb-6">
        <CardTitulo icone={TrendingUp} titulo="Evolução das reuniões" subtitulo="Reuniões marcadas e realizadas nos últimos 6 meses." />
        <Esboco>Gráfico de linha (Recharts) — abr a set/2026</Esboco>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitulo icone={Users} titulo="Leads por estágio" subtitulo="Distribuição no funil." />
          <ul className="space-y-2">
            {ESTAGIOS.map(([rotulo, n]) => (
              <li key={rotulo} className="flex items-center gap-3 text-sm">
                <span className="w-44 text-slate-600">{rotulo}</span>
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-acento" style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitulo icone={Clock} titulo="Últimos leads" subtitulo="Entraram recentemente na operação." />
          <ul className="divide-y divide-slate-100">
            {ULTIMOS.map((l) => (
              <li key={l.empresa} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-navy">{l.empresa}</p>
                  <p className="text-xs text-slate-500">{l.estagio}</p>
                </div>
                <Badge tom={FONTE_TOM[l.gatilho]}>{FONTE_ROTULO[l.gatilho]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
