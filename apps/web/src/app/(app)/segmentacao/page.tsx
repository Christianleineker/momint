"use client";

import { useState } from "react";
import { Building2, Calendar, Check, MapPin, Radio, Save, Tag, Target, X } from "lucide-react";
import { Botao, Cabecalho, Card, CardTitulo } from "@/components/ui";

// TODO: GET/PUT /api/icp (reprocessa o match ao salvar)
const CNAES_INICIAIS = ["4120400 · Construção de edifícios", "4110700 · Incorporação imobiliária", "4299599 · Outras obras de engenharia civil"];
const PORTES = ["MICRO EMPRESA", "EMPRESA DE PEQUENO PORTE", "DEMAIS"];
const FONTES = [["CNO", "Novas obras (CNO)"], ["PNCP", "Licitações (PNCP)"], ["CNPJ_NOVO", "Empresas novas (CNPJ)"]] as const;

export default function SegmentacaoPage() {
  const [cnaes, setCnaes] = useState(CNAES_INICIAIS);
  const [portes, setPortes] = useState(["EMPRESA DE PEQUENO PORTE", "DEMAIS"]);
  const [raio, setRaio] = useState(40);
  const [idadeMin, setIdadeMin] = useState(0);
  const [idadeMax, setIdadeMax] = useState(30);
  const [fontes, setFontes] = useState<string[]>(FONTES.map(([codigo]) => codigo));

  const alternar = (lista: string[], valor: string) => (lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor]);
  const fontesAtivas = FONTES.filter(([codigo]) => fontes.includes(codigo)).map(([, rotulo]) => rotulo);

  return (
    <>
      <Cabecalho titulo="Filtro e Segmentação" subtitulo="Perfil de cliente ideal (ICP): todos os critérios precisam bater." acoes={<Botao><Save aria-hidden="true" className="h-4 w-4" /> Salvar e reprocessar</Botao>} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardTitulo icone={Tag} titulo="CNAEs aceitos" subtitulo="Atividades econômicas que o perfil considera." />
            <div className="flex flex-wrap gap-2">
              {cnaes.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 py-1 pl-3 pr-1.5 text-sm text-acento">
                  {c}
                  <button type="button" aria-label={`Remover ${c}`} title="Remover" onClick={() => setCnaes((lista) => lista.filter((item) => item !== c))} className="grid h-5 w-5 place-items-center rounded-full text-acento/70 hover:bg-blue-100 hover:text-acento"><X aria-hidden="true" className="h-3 w-3" /></button>
                </span>
              ))}
              {cnaes.length === 0 && <p className="text-sm text-slate-500">Nenhum CNAE selecionado.</p>}
            </div>
          </Card>

          <Card>
            <CardTitulo icone={Building2} titulo="Porte" subtitulo="Selecione um ou mais." />
            <div className="flex flex-wrap gap-2">
              {PORTES.map((p) => {
                const ativo = portes.includes(p);
                return (
                  <button key={p} type="button" aria-pressed={ativo} onClick={() => setPortes((lista) => alternar(lista, p))} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${ativo ? "border-acento bg-blue-50 text-acento" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                    {ativo && <Check aria-hidden="true" className="h-3.5 w-3.5" />}{p}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardTitulo icone={MapPin} titulo="Região" subtitulo="Raio a partir da cidade-base." />
            <select aria-label="Cidade-base" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-acento"><option>Curitiba/PR</option></select>
            <div className="mt-4 flex items-center gap-3">
              <input aria-label="Raio em km" type="range" min={5} max={200} step={5} value={raio} onChange={(e) => setRaio(Number(e.target.value))} className="w-full accent-blue-600" />
              <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-navy">{raio} km</span>
            </div>
          </Card>

          <Card>
            <CardTitulo icone={Calendar} titulo="Idade da empresa" subtitulo="Anos desde a abertura." />
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>de</span>
              <input aria-label="Idade mínima" type="number" min={0} value={idadeMin} onChange={(e) => setIdadeMin(Number(e.target.value))} className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums outline-none focus:border-acento" />
              <span>até</span>
              <input aria-label="Idade máxima" type="number" min={0} value={idadeMax} onChange={(e) => setIdadeMax(Number(e.target.value))} className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums outline-none focus:border-acento" />
              <span>anos</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Situação cadastral: <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">ATIVA</span></p>
          </Card>

          <Card className="md:col-span-2">
            <CardTitulo icone={Radio} titulo="Fontes de gatilho ativas" subtitulo="Sinais públicos que alimentam o radar." />
            <div className="grid gap-2 sm:grid-cols-3">
              {FONTES.map(([codigo, rotulo]) => {
                const ativa = fontes.includes(codigo);
                return (
                  <label key={codigo} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${ativa ? "border-acento/40 bg-blue-50/50 text-navy" : "border-slate-200 text-slate-500"}`}>
                    <input type="checkbox" checked={ativa} onChange={() => setFontes((lista) => alternar(lista, codigo))} className="h-4 w-4 accent-blue-600" />
                    {rotulo}
                  </label>
                );
              })}
            </div>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-6">
          <Card>
            <CardTitulo icone={Target} titulo="Empresas que se encaixam neste perfil" subtitulo="Resumo dos critérios aplicados." />
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Atividade</span>{cnaes.length} {cnaes.length === 1 ? "CNAE aceito" : "CNAEs aceitos"}</li>
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Porte</span>{portes.length ? portes.join(", ") : "Nenhum porte selecionado"}</li>
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Região</span>Até {raio} km de Curitiba/PR</li>
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Idade</span>De {idadeMin} a {idadeMax} anos, com situação ativa</li>
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Gatilhos</span>{fontesAtivas.length ? fontesAtivas.join(", ") : "Nenhuma fonte ativa"}</li>
            </ul>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Todos os critérios precisam bater para a empresa entrar no radar.</p>
          </Card>
        </aside>
      </div>
    </>
  );
}
