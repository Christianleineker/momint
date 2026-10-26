"use client";

import type { FormEvent } from "react";
import { useEffect, useRef } from "react";
import { CalendarPlus, X } from "lucide-react";
import { Botao } from "@/components/ui";

export type Agendamento = { id: string; empresa: string; inicio: string; duracaoMin: number; vendedor: string; confirmada: boolean };

export function NovaReuniao({ onFechar, onSalvar }: { onFechar: () => void; onSalvar: (reuniao: Agendamento) => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

  useEffect(() => {
    const elemento = dialogo.current;
    const anterior = document.activeElement as HTMLElement | null;
    elemento?.showModal();
    return () => { elemento?.close(); if (anterior?.isConnected) anterior.focus(); };
  }, []);

  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const dados = new FormData(form);
    const empresa = String(dados.get("empresa") ?? "").trim();
    const controle = form.elements.namedItem("empresa") as HTMLInputElement;
    controle.setCustomValidity(empresa ? "" : "Informe a empresa.");
    if (!form.reportValidity()) return;
    onSalvar({ id: crypto.randomUUID(), empresa, inicio: new Date(String(dados.get("inicio"))).toISOString(), duracaoMin: Number(dados.get("duracao")), vendedor: String(dados.get("vendedor")), confirmada: dados.has("confirmada") });
  }

  return (
    <dialog ref={dialogo} aria-labelledby="nova-reuniao-titulo" onCancel={onFechar} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-xl backdrop:bg-navy/40" onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onFechar();
    }}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="nova-reuniao-titulo" className="text-lg font-semibold text-navy">Nova reunião</h2>
        <button type="button" aria-label="Fechar" title="Fechar" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      <form onSubmit={salvar} className="space-y-4">
        <label className="block text-sm font-medium">Empresa<input autoFocus name="empresa" required maxLength={120} className={campo} onInput={(event) => event.currentTarget.setCustomValidity("")} /></label>
        <label className="block text-sm font-medium">Data e horário<input name="inicio" type="datetime-local" required className={`${campo} min-w-0`} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Responsável<select name="vendedor" className={campo}>{["Rafael Nunes", "Carla Dias", "Gestor ImperSul"].map((nome) => <option key={nome}>{nome}</option>)}</select></label>
          <label className="block text-sm font-medium">Duração (minutos)<input name="duracao" type="number" min={15} max={240} step={15} defaultValue={45} required className={campo} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input name="confirmada" type="checkbox" className="h-4 w-4 accent-blue-600" />Reunião confirmada</label>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit"><CalendarPlus aria-hidden="true" className="h-4 w-4" />Agendar reunião</Botao>
        </div>
      </form>
    </dialog>
  );
}
