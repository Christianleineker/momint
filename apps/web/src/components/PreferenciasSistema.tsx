"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, MessageSquareQuote, Save, ShieldCheck } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, CardTitulo } from "@/components/ui";
import { EstadoDados } from "@/components/EstadoDados";
import { acao, useApi } from "@/lib/useApi";

type Cliente = { vozMarca: "consultivo" | "direto" | "proximo"; assinaturaEmail: string | null; modoOperacao: "COPILOTO" | "AUTOPILOT"; calendarioProvedor: "google" | "outlook" | null; calendarioConectado: boolean };
const VOZES = [["consultivo", "Consultivo"], ["direto", "Direto"], ["proximo", "Próximo"]] as const;

function Formulario({ cliente, podeGerir, children }: { cliente: Cliente; podeGerir: boolean; children: ReactNode }) {
  const [vozMarca, setVozMarca] = useState(cliente.vozMarca);
  const [assinatura, setAssinatura] = useState(cliente.assinaturaEmail ?? "");
  const [autopilot, setAutopilot] = useState(cliente.modoOperacao === "AUTOPILOT");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    await acao("/api/configuracoes", "PUT", {
      vozMarca,
      assinaturaEmail: assinatura.trim() || null,
      modoOperacao: autopilot ? "AUTOPILOT" : "COPILOTO",
      calendarioProvedor: cliente.calendarioProvedor,
      calendarioConectado: cliente.calendarioConectado,
    }, { sucesso: "Configurações salvas.", recarregar: ["/api/configuracoes", "/api/cadencia"] });
    setSalvando(false);
  }

  return (
    <>
      <Cabecalho titulo="Configurações" subtitulo="Voz da marca, operação, calendário e equipe." acoes={podeGerir && <Botao disabled={salvando} onClick={() => void salvar()}><Save aria-hidden="true" className="h-4 w-4" /> {salvando ? "Salvando..." : "Salvar"}</Botao>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitulo icone={MessageSquareQuote} titulo="Voz da marca" subtitulo="Tom das mensagens geradas." />
          <fieldset disabled={!podeGerir || salvando}>
            <div className="grid grid-cols-3 gap-2">
              {VOZES.map(([valor, rotulo]) => (
                <label key={valor} className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition ${vozMarca === valor ? "border-acento bg-blue-50 text-acento" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  <input type="radio" name="voz" checked={vozMarca === valor} onChange={() => setVozMarca(valor)} className="sr-only" /> {rotulo}
                </label>
              ))}
            </div>
            <textarea aria-label="Assinatura de e-mail" placeholder="Assinatura de e-mail" value={assinatura} onChange={(e) => setAssinatura(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-acento" rows={2} />
          </fieldset>
        </Card>
        <Card>
          <CardTitulo icone={ShieldCheck} titulo="Modo de operação" />
          <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm">
            <span><b className="text-navy">Autopilot</b> — enviar sem aprovação</span>
            <input type="checkbox" disabled={!podeGerir || salvando} checked={autopilot} onChange={(e) => setAutopilot(e.target.checked)} className="h-4 w-4 accent-blue-600" />
          </label>
          <p className="mt-2 text-xs text-slate-500">Desligado = Copiloto (padrão): tudo passa pela fila de aprovação.</p>
        </Card>
        <Card>
          <CardTitulo icone={CalendarDays} titulo="Integração de calendário" extra={cliente.calendarioConectado && cliente.calendarioProvedor ? <Badge tom="verde">Conectado · {cliente.calendarioProvedor === "google" ? "Google" : "Outlook"}</Badge> : <Badge tom="cinza">Não conectado</Badge>} />
          <div className="flex flex-wrap gap-3">
            <Botao variante="secundario" disabled title="A conexão com calendários ainda não está disponível">Conectar Google Agenda</Botao>
            <Botao variante="secundario" disabled title="A conexão com calendários ainda não está disponível">Conectar Outlook</Botao>
          </div>
          <p className="mt-2 text-xs text-slate-500">A conexão com calendários ainda não está disponível.</p>
        </Card>
        {children}
      </div>
    </>
  );
}

/** Preferências do sistema (GET/PUT /api/configuracoes). `children` recebe o cartão da equipe. */
export function PreferenciasSistema({ podeGerir, children }: { podeGerir: boolean; children: ReactNode }) {
  const { data, error, isLoading, mutate } = useApi<{ cliente: Cliente }>("/api/configuracoes");
  if (!data) {
    return (
      <>
        <Cabecalho titulo="Configurações" subtitulo="Voz da marca, operação, calendário e equipe." />
        <EstadoDados erro={error} carregando={isLoading} tentar={mutate} texto="Carregando configurações..." />
      </>
    );
  }
  return <Formulario cliente={data.cliente} podeGerir={podeGerir}>{children}</Formulario>;
}
