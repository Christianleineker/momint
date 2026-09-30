import { CalendarCheck, ChevronDown, Clock } from "lucide-react";
import { Badge, Cabecalho, Card, Metrica } from "@/components/ui";

// TODO: GET /api/reunioes + PATCH status + expandir briefing
const REUNIOES = [
  { empresa: "Monteiro Engenharia", quando: "Sex, 02/10 · 14:00–14:45", vendedor: "Rafael Nunes", status: "Agendada", tom: "azul" as const },
  { empresa: "Cota Zero Engenharia", quando: "Qui, 24/09 · 10:00–11:00", vendedor: "Carla Dias", status: "Realizada", tom: "verde" as const },
  { empresa: "Nova Base Construções", quando: "Qui, 10/09 · 11:00–11:45", vendedor: "Rafael Nunes", status: "Realizada", tom: "verde" as const },
];

export default function ReunioesPage() {
  return (
    <>
      <Cabecalho titulo="Reuniões" subtitulo="Agenda comercial e briefings pré-reunião." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Metrica icone={CalendarCheck} rotulo="Próximas" valor="1" tom="azul" />
        <Metrica icone={CalendarCheck} rotulo="Realizadas no mês" valor="2" tom="verde" />
        <Metrica icone={Clock} rotulo="Taxa de comparecimento" valor="100%" tom="roxo" />
      </div>
      <Card>
        <ul className="divide-y divide-slate-100">
          {REUNIOES.map((r) => (
            <li key={r.empresa} className="py-4">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">{r.empresa}</p>
                    <p className="text-sm text-slate-500">{r.quando} · {r.vendedor}</p>
                  </div>
                  <Badge tom={r.tom}>{r.status}</Badge>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </summary>
                <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Briefing pré-reunião: empresa, por que agora, qualificação e pauta sugerida.</div>
              </details>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
