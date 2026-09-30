import Link from "next/link";
import { Columns3, List } from "lucide-react";
import { Badge, Botao, Cabecalho, FONTE_ROTULO, FONTE_TOM } from "@/components/ui";

// TODO: GET /api/leads, drag-and-drop → PATCH /api/leads/:id/estagio
const COLUNAS: Array<{ estagio: string; leads: Array<{ id: string; empresa: string; gatilho: string; dono: string }> }> = [
  { estagio: "Apto a abordar", leads: [{ id: "1", empresa: "Bauen Construções", gatilho: "CNO", dono: "Rafael Nunes" }] },
  { estagio: "Aguardando aprovação", leads: [
    { id: "2", empresa: "Prisma Incorporadora", gatilho: "PNCP", dono: "Carla Dias" },
    { id: "3", empresa: "Construtora Horizonte", gatilho: "CNO", dono: "Rafael Nunes" },
  ] },
  { estagio: "Em cadência", leads: [{ id: "4", empresa: "Solidez Construtora", gatilho: "PNCP", dono: "Carla Dias" }] },
  { estagio: "Engajado", leads: [{ id: "5", empresa: "Ribeira Incorporações", gatilho: "CNO", dono: "Rafael Nunes" }] },
  { estagio: "Qualificando", leads: [{ id: "6", empresa: "Araucária Prime", gatilho: "CNO", dono: "Carla Dias" }] },
  { estagio: "Reunião marcada", leads: [{ id: "7", empresa: "Monteiro Engenharia", gatilho: "CNO", dono: "Rafael Nunes" }] },
  { estagio: "Reunião realizada", leads: [{ id: "8", empresa: "Cota Zero Engenharia", gatilho: "PNCP", dono: "Carla Dias" }] },
  { estagio: "Ganho / Perdido", leads: [] },
];

export default function LeadsPage() {
  return (
    <>
      <Cabecalho
        titulo="Leads"
        subtitulo="Pipeline dos leads pelas etapas da prospecção."
        acoes={
          <>
            <Botao variante="secundario"><List className="h-4 w-4" /> Lista</Botao>
            <Botao><Columns3 className="h-4 w-4" /> Kanban</Botao>
          </>
        }
      />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUNAS.map((c) => (
          <div key={c.estagio} className="w-64 shrink-0 rounded-2xl bg-slate-100/70 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-navy">{c.estagio}</h3>
              <span className="text-xs text-slate-500">{c.leads.length}</span>
            </div>
            <div className="space-y-2">
              {c.leads.map((l) => (
                <Link key={l.id} href={`/leads/${l.id}`} draggable className="block rounded-xl bg-white p-3 shadow-sm hover:ring-2 hover:ring-acento/30">
                  <p className="font-medium text-navy">{l.empresa}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge tom={FONTE_TOM[l.gatilho]}>{FONTE_ROTULO[l.gatilho]}</Badge>
                    <span className="text-xs text-slate-500">{l.dono}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
