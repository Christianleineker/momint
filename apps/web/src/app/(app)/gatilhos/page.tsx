import { Plus, RefreshCw, Search, Zap } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, CardTitulo, FONTE_ROTULO, FONTE_TOM, Metrica, PRIORIDADE_ROTULO, PRIORIDADE_TOM } from "@/components/ui";

// TODO: GET /api/radar + POST /api/radar/:eventoId/fila + filtros
const EVENTOS = [
  { empresa: "Prisma Incorporadora", tipo: "PNCP", resumo: "Conjunto habitacional — COHAPAR", cidade: "São José dos Pinhais/PR", data: "25/09/2026", prioridade: "ALTA", empilhados: 2 },
  { empresa: "Prisma Incorporadora", tipo: "CNO", resumo: "Residencial multifamiliar 12.300 m²", cidade: "São José dos Pinhais/PR", data: "18/09/2026", prioridade: "ALTA", empilhados: 2 },
  { empresa: "Construtora Horizonte", tipo: "CNO", resumo: "Residencial multifamiliar 8.400 m²", cidade: "Curitiba/PR", data: "22/09/2026", prioridade: "MEDIA", empilhados: 1 },
  { empresa: "Alicerce Obras", tipo: "CNPJ_NOVO", resumo: "Empresa recém-aberta", cidade: "Curitiba/PR", data: "15/09/2026", prioridade: "MEDIA", empilhados: 1 },
  { empresa: "Edifica Engenharia", tipo: "PNCP", resumo: "Impermeabilização de 6 escolas", cidade: "Colombo/PR", data: "12/09/2026", prioridade: "MEDIA", empilhados: 1 },
  { empresa: "Bauen Construções", tipo: "CNO", resumo: "Comercial 3.200 m²", cidade: "Pinhais/PR", data: "08/09/2026", prioridade: "BAIXA", empilhados: 1 },
];

export default function GatilhosPage() {
  return (
    <>
      <Cabecalho
        titulo="Radar de Gatilhos"
        subtitulo="Eventos de dados públicos que indicam o momento de compra."
        acoes={<Botao variante="secundario"><RefreshCw className="h-4 w-4" /> Sincronizar fontes</Botao>}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Metrica icone={Zap} rotulo="Gatilhos ativos" valor="14" tom="azul" />
        <Metrica icone={Zap} rotulo="Empilhados (2+)" valor="1" tom="vermelho" />
        <Metrica icone={Zap} rotulo="Fora do ICP" valor="4" tom="cinza" />
      </div>
      <Card>
        <CardTitulo titulo="Eventos detectados" subtitulo="Filtre por tipo, prioridade e cidade." />
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input placeholder="Buscar empresa..." className="flex-1 text-sm outline-none" />
          </div>
          {["Tipo", "Prioridade", "Cidade"].map((f) => (
            <select key={f} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option>{f}: todos</option>
            </select>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Empresa</th><th className="p-3">Gatilho</th><th className="p-3">Cidade/UF</th>
              <th className="p-3">Detecção</th><th className="p-3">Prioridade</th><th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {EVENTOS.map((e, i) => (
              <tr key={i} className={e.empilhados >= 2 ? "bg-red-50/40" : ""}>
                <td className="p-3">
                  <p className="font-medium text-navy">{e.empresa}</p>
                  <p className="text-xs text-slate-500">{e.resumo}</p>
                </td>
                <td className="p-3"><Badge tom={FONTE_TOM[e.tipo]}>{FONTE_ROTULO[e.tipo]}</Badge></td>
                <td className="p-3 text-slate-600">{e.cidade}</td>
                <td className="p-3 text-slate-600">{e.data}</td>
                <td className="p-3">
                  <Badge tom={PRIORIDADE_TOM[e.prioridade]}>{PRIORIDADE_ROTULO[e.prioridade]}{e.empilhados >= 2 && " · 2 gatilhos"}</Badge>
                </td>
                <td className="p-3 text-right">
                  <Botao variante="secundario" className="px-3 py-1.5"><Plus className="h-4 w-4" /> Fila</Botao>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
