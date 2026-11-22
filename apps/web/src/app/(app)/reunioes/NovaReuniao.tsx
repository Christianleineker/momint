"use client";

import { useState, type FormEvent } from "react";
import { CalendarPlus } from "lucide-react";
import { Botao } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { acao } from "@/lib/useApi";

export type LeadAgendavel = { id: string; estagio: string; empresa: { nome: string }; dono: { nome: string } | null };

const campo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

/** Agenda uma reunião para um lead (POST /api/leads/:id/reunioes). A API exige a qualificação completa. */
export function NovaReuniao({ leads, onFechar }: { leads: LeadAgendavel[]; onFechar: () => void }) {
  const [salvando, setSalvando] = useState(false);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    setSalvando(true);
    const ok = await acao(`/api/leads/${dados.get("lead")}/reunioes`, "POST", { inicio: new Date(String(dados.get("inicio"))).toISOString(), duracaoMin: Number(dados.get("duracao")) }, {
      sucesso: "Reunião agendada. O briefing já está disponível.",
      recarregar: ["/api/reunioes", "/api/leads", "/api/dashboard"],
    });
    setSalvando(false);
    if (ok !== null) onFechar();
  }

  return (
    <Modal titulo="Nova reunião" ocupado={salvando} fechar={() => { if (!salvando) onFechar(); }}>
      <form onSubmit={salvar} className="space-y-4">
        <fieldset disabled={salvando} className="space-y-4">
          <label className="block text-sm font-medium">Lead
            <select name="lead" required defaultValue="" className={campo}>
              <option value="" disabled>Selecione um lead engajado ou em qualificação</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.empresa.nome}{l.dono ? ` · ${l.dono.nome}` : ""}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Data e horário<input name="inicio" type="datetime-local" required className={`${campo} min-w-0`} /></label>
            <label className="block text-sm font-medium">Duração (minutos)<input name="duracao" type="number" min={15} max={240} step={15} defaultValue={45} required className={campo} /></label>
          </div>
          <p className="text-xs leading-5 text-slate-500">{leads.length ? "A reunião fica com o responsável do lead. O lead precisa ter necessidade, momento e encaixe confirmados." : "Nenhum lead engajado ou em qualificação no momento."}</p>
        </fieldset>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <Botao type="button" variante="secundario" disabled={salvando} onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvando || !leads.length}><CalendarPlus aria-hidden="true" className="h-4 w-4" />{salvando ? "Agendando..." : "Agendar reunião"}</Botao>
        </div>
      </form>
    </Modal>
  );
}
