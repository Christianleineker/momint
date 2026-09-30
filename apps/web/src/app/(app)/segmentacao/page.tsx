import { Building2, Calendar, MapPin, Radio, Save, Tag, X } from "lucide-react";
import { Botao, Cabecalho, Card, CardTitulo } from "@/components/ui";

// TODO: GET/PUT /api/icp (reprocessa o match ao salvar)
const CNAES = ["4120400 · Construção de edifícios", "4110700 · Incorporação imobiliária", "4299599 · Outras obras de engenharia civil"];
const PORTES = [["MICRO EMPRESA", false], ["EMPRESA DE PEQUENO PORTE", true], ["DEMAIS", true]] as const;
const FONTES = [["CNO", "Novas obras (CNO)"], ["PNCP", "Licitações (PNCP)"], ["CNPJ_NOVO", "Empresas novas (CNPJ)"]] as const;

export default function SegmentacaoPage() {
  return (
    <>
      <Cabecalho titulo="Filtro e Segmentação" subtitulo="Perfil de cliente ideal (ICP): todos os critérios precisam bater." acoes={<Botao><Save className="h-4 w-4" /> Salvar e reprocessar</Botao>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitulo icone={Tag} titulo="CNAEs aceitos" />
          <div className="flex flex-wrap gap-2">
            {CNAES.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-acento">{c} <X className="h-3 w-3" /></span>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitulo icone={Building2} titulo="Porte" />
          {PORTES.map(([p, on]) => (
            <label key={p} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" defaultChecked={on} /> {p}</label>
          ))}
        </Card>
        <Card>
          <CardTitulo icone={MapPin} titulo="Região" subtitulo="Raio a partir da cidade-base." />
          <div className="flex gap-3">
            <select className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"><option>Curitiba/PR</option></select>
            <input type="number" defaultValue={40} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <span className="self-center text-sm text-slate-500">km</span>
          </div>
        </Card>
        <Card>
          <CardTitulo icone={Calendar} titulo="Idade da empresa" subtitulo="Anos desde a abertura." />
          <div className="flex items-center gap-3 text-sm">
            de <input type="number" defaultValue={0} className="w-20 rounded-lg border border-slate-200 px-3 py-2" />
            até <input type="number" defaultValue={30} className="w-20 rounded-lg border border-slate-200 px-3 py-2" /> anos · situação <b>ATIVA</b>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitulo icone={Radio} titulo="Fontes de gatilho ativas" />
          <div className="flex flex-wrap gap-6">
            {FONTES.map(([k, rot]) => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> {rot}</label>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
