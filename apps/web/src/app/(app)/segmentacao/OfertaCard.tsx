"use client";

import { useState } from "react";
import { PackageCheck, Save } from "lucide-react";
import { Botao, Card, CardTitulo } from "@/components/ui";
import { EstadoDados } from "@/components/EstadoDados";
import { acao, useApi } from "@/lib/useApi";

type Oferta = { produto: string; descricao: string; proposta: string; beneficio: string; compradores: string; pauta: string };
const VAZIA: Oferta = { produto: "", descricao: "", proposta: "", beneficio: "", compradores: "", pauta: "" };

type Campo = { chave: keyof Oferta; rotulo: string; ajuda: string; exemplo: string; max: number; largo?: boolean; linhas?: number };
const CAMPOS: Campo[] = [
  { chave: "produto", rotulo: "O que você vende, em poucas palavras", ajuda: "Vai no assunto do e-mail.", exemplo: "Ex.: impermeabilização", max: 60 },
  { chave: "compradores", rotulo: "Quem compra", ajuda: "Quem decide a compra do lado do lead. Entra no briefing.", exemplo: "Ex.: engenheiro da obra ou suprimentos", max: 240 },
  { chave: "descricao", rotulo: "Descrição da oferta", ajuda: "Produtos, serviços, garantias e diferenciais.", exemplo: "O que a sua empresa entrega, com detalhes", max: 800, largo: true, linhas: 3 },
  { chave: "proposta", rotulo: "Como você se apresenta", ajuda: "Completa a frase “Na sua empresa, …” da mensagem.", exemplo: "Ex.: atendemos construtoras do Paraná com projeto, execução e garantia", max: 240, largo: true },
  { chave: "beneficio", rotulo: "Por que agir agora", ajuda: "Completa a frase “Para executar esse contrato dentro do prazo, …”.", exemplo: "Ex.: definir o fornecedor desde o início evita retrabalho e atraso na entrega", max: 240, largo: true },
  { chave: "pauta", rotulo: "Foco técnico da reunião", ajuda: "Entra na sugestão de pauta do briefing.", exemplo: "Ex.: áreas críticas da obra e prazos de aplicação", max: 240, largo: true },
];

/** Mesmo encaixe que a API faz ao montar a mensagem: sem ponto final e com inicial minúscula. */
function continuarFrase(texto: string) {
  const t = texto.trim().replace(/[.;!\s]+$/u, "");
  return /^\p{Lu}\p{Ll}/u.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

function Formulario({ inicial, empresa, podeGerir }: { inicial: Oferta | null; empresa: string; podeGerir: boolean }) {
  const [oferta, setOferta] = useState<Oferta>(inicial ?? VAZIA);
  const [salvando, setSalvando] = useState(false);
  const completa = CAMPOS.every(({ chave }) => oferta[chave].trim().length >= 3);

  async function salvar() {
    setSalvando(true);
    await acao("/api/oferta", "PUT", oferta, { sucesso: "Oferta salva. As próximas abordagens já usam este texto.", recarregar: ["/api/oferta"] });
    setSalvando(false);
  }

  return (
    <Card className="mb-6">
      <CardTitulo
        icone={PackageCheck}
        titulo="O que você vende"
        subtitulo="Base de toda abordagem e do briefing de reunião. Sem a oferta, o Momint não gera mensagens."
        extra={podeGerir && <Botao disabled={salvando || !completa} onClick={() => void salvar()}><Save aria-hidden="true" className="h-4 w-4" />{salvando ? "Salvando..." : "Salvar oferta"}</Botao>}
      />
      {!inicial && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Sua oferta ainda não foi cadastrada. Preencha os campos para o Momint escrever as abordagens com o que a sua empresa vende.</p>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <fieldset disabled={!podeGerir || salvando} className="grid gap-4 md:grid-cols-2">
          {CAMPOS.map(({ chave, rotulo, ajuda, exemplo, max, largo, linhas }) => {
            const props = {
              value: oferta[chave],
              maxLength: max,
              placeholder: exemplo,
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setOferta((atual) => ({ ...atual, [chave]: e.target.value })),
              className: "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-acento focus:ring-2 focus:ring-blue-100",
            };
            return (
              <label key={chave} className={`block text-sm font-medium text-navy ${largo ? "md:col-span-2" : ""}`}>
                {rotulo}
                {linhas ? <textarea rows={linhas} {...props} /> : <input {...props} />}
                <span className="mt-1 block text-xs font-normal text-slate-500">{ajuda}</span>
              </label>
            );
          })}
        </fieldset>
        <aside className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Prévia na mensagem</p>
          {completa ? (
            <>
              <p className="font-medium text-navy">Assunto: Construtora — {continuarFrase(oferta.produto)} para a nova etapa</p>
              <p className="mt-2">Para executar esse contrato dentro do prazo, {continuarFrase(oferta.beneficio)}.</p>
              <p className="mt-2">Na {empresa}, {continuarFrase(oferta.proposta)}.</p>
            </>
          ) : (
            <p className="text-slate-500">Preencha todos os campos para ver como o texto entra na abordagem.</p>
          )}
        </aside>
      </div>
    </Card>
  );
}

export function OfertaCard({ empresa, podeGerir }: { empresa: string; podeGerir: boolean }) {
  const { data, error, isLoading, mutate } = useApi<{ oferta: Oferta | null }>("/api/oferta");
  if (!data) return <EstadoDados erro={error} carregando={isLoading} tentar={mutate} />;
  return <Formulario inicial={data.oferta} empresa={empresa} podeGerir={podeGerir} />;
}
