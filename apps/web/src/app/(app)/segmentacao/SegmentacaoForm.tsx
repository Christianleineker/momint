"use client";

import { useState } from "react";
import { Building2, Calendar, Check, MapPin, Radio, Save, Tag, Target, X } from "lucide-react";
import { Botao, Cabecalho, Card, CardTitulo } from "@/components/ui";
import { EstadoDados } from "@/components/EstadoDados";
import { acao, useApi } from "@/lib/useApi";
import { OfertaCard } from "./OfertaCard";

type Icp = { cnaes: string[]; portes: string[]; cidadeBase: string; raioKm: number; idadeMinAnos: number; idadeMaxAnos: number; fontesAtivas: string[] };
type DadosIcp = { icp: Icp; cidades: string[]; catalogoCnae: { codigo: string; descricao: string }[] };

const PORTES = ["MICRO EMPRESA", "EMPRESA DE PEQUENO PORTE", "DEMAIS"];
const FONTES = [["CNO", "Novas obras (CNO)"], ["PNCP", "Licitações (PNCP)"], ["CNPJ_NOVO", "Empresas novas (CNPJ)"]] as const;
const alternar = (lista: string[], valor: string) => (lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor]);

function Formulario({ dados, podeGerir, empresa }: { dados: DadosIcp; podeGerir: boolean; empresa: string }) {
  const [icp, setIcp] = useState<Icp>(dados.icp);
  const [salvando, setSalvando] = useState(false);
  const descricao = (codigo: string) => dados.catalogoCnae.find((c) => c.codigo === codigo)?.descricao ?? "";
  const disponiveis = dados.catalogoCnae.filter((c) => !icp.cnaes.includes(c.codigo));
  const fontesAtivas = FONTES.filter(([codigo]) => icp.fontesAtivas.includes(codigo)).map(([, rotulo]) => rotulo);
  const atualizar = (parcial: Partial<Icp>) => setIcp((atual) => ({ ...atual, ...parcial }));

  async function salvar() {
    setSalvando(true);
    await acao("/api/icp", "PUT", icp, { sucesso: "Segmentação salva. O radar foi reprocessado com o novo perfil.", recarregar: ["/api/icp", "/api/radar", "/api/leads", "/api/dashboard"] });
    setSalvando(false);
  }

  return (
    <>
      <Cabecalho titulo="Filtro e Segmentação" subtitulo="O que você vende e o perfil de cliente ideal (ICP) que o radar procura." acoes={podeGerir && <Botao disabled={salvando} onClick={() => void salvar()}><Save aria-hidden="true" className="h-4 w-4" /> {salvando ? "Salvando..." : "Salvar perfil e reprocessar"}</Botao>} />
      {!podeGerir && <p className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">Somente gestores podem alterar a segmentação. Você está vendo o perfil atual.</p>}
      <OfertaCard empresa={empresa} podeGerir={podeGerir} />
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Perfil de cliente ideal (ICP) · todos os critérios precisam bater</h2>
      <fieldset disabled={!podeGerir || salvando} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardTitulo icone={Tag} titulo="CNAEs aceitos" subtitulo="Atividades econômicas que o perfil considera." />
            <div className="flex flex-wrap gap-2">
              {icp.cnaes.map((codigo) => (
                <span key={codigo} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 py-1 pl-3 pr-1.5 text-sm text-acento">
                  {codigo}{descricao(codigo) && ` · ${descricao(codigo)}`}
                  {podeGerir && <button type="button" aria-label={`Remover ${codigo}`} title="Remover" onClick={() => atualizar({ cnaes: icp.cnaes.filter((c) => c !== codigo) })} className="grid h-5 w-5 place-items-center rounded-full text-acento/70 hover:bg-blue-100 hover:text-acento"><X aria-hidden="true" className="h-3 w-3" /></button>}
                </span>
              ))}
              {icp.cnaes.length === 0 && <p className="text-sm text-slate-500">Nenhum CNAE selecionado.</p>}
            </div>
            {podeGerir && disponiveis.length > 0 && (
              <select aria-label="Adicionar CNAE" value="" onChange={(e) => { if (e.target.value) atualizar({ cnaes: [...icp.cnaes, e.target.value] }); }} className="mt-3 h-10 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-acento">
                <option value="">Adicionar CNAE do catálogo...</option>
                {disponiveis.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.descricao}</option>)}
              </select>
            )}
          </Card>

          <Card>
            <CardTitulo icone={Building2} titulo="Porte" subtitulo="Selecione um ou mais." />
            <div className="flex flex-wrap gap-2">
              {PORTES.map((p) => {
                const ativo = icp.portes.includes(p);
                return (
                  <button key={p} type="button" aria-pressed={ativo} onClick={() => atualizar({ portes: alternar(icp.portes, p) })} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-default ${ativo ? "border-acento bg-blue-50 text-acento" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                    {ativo && <Check aria-hidden="true" className="h-3.5 w-3.5" />}{p}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardTitulo icone={MapPin} titulo="Região" subtitulo="Raio a partir da cidade-base." />
            <select aria-label="Cidade-base" value={icp.cidadeBase} onChange={(e) => atualizar({ cidadeBase: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-acento">
              {!dados.cidades.includes(icp.cidadeBase) && <option value={icp.cidadeBase}>{icp.cidadeBase || "Selecione"}</option>}
              {dados.cidades.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="mt-4 flex items-center gap-3">
              <input aria-label="Raio em km" type="range" min={5} max={Math.max(300, icp.raioKm)} step={5} value={icp.raioKm} onChange={(e) => atualizar({ raioKm: Number(e.target.value) })} className="w-full accent-blue-600" />
              <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-navy">{icp.raioKm} km</span>
            </div>
          </Card>

          <Card>
            <CardTitulo icone={Calendar} titulo="Idade da empresa" subtitulo="Anos desde a abertura." />
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>de</span>
              <input aria-label="Idade mínima" type="number" min={0} value={icp.idadeMinAnos} onChange={(e) => atualizar({ idadeMinAnos: Number(e.target.value) })} className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums outline-none focus:border-acento" />
              <span>até</span>
              <input aria-label="Idade máxima" type="number" min={0} value={icp.idadeMaxAnos} onChange={(e) => atualizar({ idadeMaxAnos: Number(e.target.value) })} className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums outline-none focus:border-acento" />
              <span>anos</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Situação cadastral: <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">ATIVA</span></p>
          </Card>

          <Card className="md:col-span-2">
            <CardTitulo icone={Radio} titulo="Fontes de gatilho ativas" subtitulo="Sinais públicos que alimentam o radar." />
            <div className="grid gap-2 sm:grid-cols-3">
              {FONTES.map(([codigo, rotulo]) => {
                const ativa = icp.fontesAtivas.includes(codigo);
                return (
                  <label key={codigo} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${ativa ? "border-acento/40 bg-blue-50/50 text-navy" : "border-slate-200 text-slate-500"}`}>
                    <input type="checkbox" checked={ativa} onChange={() => atualizar({ fontesAtivas: alternar(icp.fontesAtivas, codigo) })} className="h-4 w-4 accent-blue-600" />
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
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Atividade</span>{icp.cnaes.length} {icp.cnaes.length === 1 ? "CNAE aceito" : "CNAEs aceitos"}</li>
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Porte</span>{icp.portes.length ? icp.portes.join(", ") : "Nenhum porte selecionado"}</li>
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Região</span>Até {icp.raioKm} km de {icp.cidadeBase || "uma cidade-base"}</li>
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Idade</span>De {icp.idadeMinAnos} a {icp.idadeMaxAnos} anos, com situação ativa</li>
              <li><span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Gatilhos</span>{fontesAtivas.length ? fontesAtivas.join(", ") : "Nenhuma fonte ativa"}</li>
            </ul>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Todos os critérios precisam bater para a empresa entrar no radar.</p>
          </Card>
        </aside>
      </fieldset>
    </>
  );
}

export function SegmentacaoForm({ podeGerir, empresa }: { podeGerir: boolean; empresa: string }) {
  const { data, error, isLoading, mutate } = useApi<DadosIcp>("/api/icp");
  if (!data) {
    return (
      <>
        <Cabecalho titulo="Filtro e Segmentação" subtitulo="O que você vende e o perfil de cliente ideal (ICP) que o radar procura." />
        <EstadoDados erro={error} carregando={isLoading} tentar={mutate} texto="Carregando a segmentação..." />
      </>
    );
  }
  return <Formulario dados={data} podeGerir={podeGerir} empresa={empresa} />;
}
