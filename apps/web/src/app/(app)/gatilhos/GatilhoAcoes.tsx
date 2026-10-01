"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, MoreHorizontal, Pause, Pencil, Play, Save, Trash2, X } from "lucide-react";
import { Botao, FONTE_ROTULO } from "@/components/ui";

export type Fonte = "CNO" | "PNCP" | "CNPJ_NOVO";
export type Gatilho = {
  id: string;
  nome: string;
  descricao: string;
  fonte: Fonte;
  criterio: string;
  responsavel: string;
  ativo: boolean;
  ultimaOcorrencia: string;
  leads: number;
};
export type Acao = "editar" | "duplicar" | "alternar" | "remover";
export type Dialogo = { tipo: "novo" } | { tipo: "editar" | "duplicar" | "remover"; gatilho: Gatilho };

export function MenuGatilho({ gatilho, onAcao }: { gatilho: Gatilho; onAcao: (acao: Acao) => void }) {
  const botao = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);

  function fechar(devolverFoco = false) {
    setPosicao(null);
    if (devolverFoco) botao.current?.focus();
  }

  useEffect(() => {
    if (!posicao) return;
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function clicarFora(event: PointerEvent) {
      const alvo = event.target as Node;
      if (!menu.current?.contains(alvo) && !botao.current?.contains(alvo)) setPosicao(null);
    }
    function ocultar() { setPosicao(null); }
    document.addEventListener("pointerdown", clicarFora);
    window.addEventListener("resize", ocultar);
    window.addEventListener("scroll", ocultar, true);
    return () => {
      document.removeEventListener("pointerdown", clicarFora);
      window.removeEventListener("resize", ocultar);
      window.removeEventListener("scroll", ocultar, true);
    };
  }, [posicao]);

  function navegar(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      fechar(true);
      return;
    }
    const botoes = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
    const proximo = event.key === "ArrowDown" ? (atual + 1) % botoes.length
      : event.key === "ArrowUp" ? (atual - 1 + botoes.length) % botoes.length
      : event.key === "Home" ? 0 : event.key === "End" ? botoes.length - 1 : -1;
    if (proximo >= 0) { event.preventDefault(); botoes[proximo]?.focus(); }
  }

  const acoes = [
    { acao: "editar" as const, rotulo: "Editar gatilho", icone: Pencil },
    { acao: "duplicar" as const, rotulo: "Duplicar gatilho", icone: Copy },
    { acao: "alternar" as const, rotulo: gatilho.ativo ? "Pausar gatilho" : "Ativar gatilho", icone: gatilho.ativo ? Pause : Play },
    { acao: "remover" as const, rotulo: "Remover gatilho", icone: Trash2 },
  ];

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={`Ações de ${gatilho.nome}`}
        aria-haspopup="menu"
        aria-expanded={!!posicao}
        aria-controls={posicao ? `menu-${gatilho.id}` : undefined}
        title="Ações do gatilho"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-50 hover:text-acento focus-visible:outline-2 focus-visible:outline-acento"
        onClick={() => {
          if (posicao) { fechar(); return; }
          const rect = botao.current!.getBoundingClientRect();
          setPosicao({ top: rect.bottom + 6 + 176 > window.innerHeight ? Math.max(8, rect.top - 182) : rect.bottom + 6, left: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216)) });
        }}
      >
        <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
      </button>
      {posicao && createPortal(
        <div ref={menu} id={`menu-${gatilho.id}`} role="menu" aria-label={`Ações de ${gatilho.nome}`} onKeyDown={navegar} style={posicao} className="fixed z-50 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {acoes.map(({ acao, rotulo, icone: Icone }) => (
            <button key={acao} type="button" role="menuitem" className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm outline-none ${acao === "remover" ? "border-t border-slate-100 text-red-600 hover:bg-red-50 focus:bg-red-50" : "text-slate-700 hover:bg-blue-50 focus:bg-blue-50"}`} onClick={() => { fechar(true); onAcao(acao); }}>
              <Icone aria-hidden="true" className="h-4 w-4" />{rotulo}
            </button>
          ))}
        </div>, document.body
      )}
    </>
  );
}

export function DialogoGatilho({ dialogo, responsaveis, onFechar, onSalvar, onRemover }: { dialogo: Dialogo; responsaveis: string[]; onFechar: () => void; onSalvar: (gatilho: Gatilho) => void; onRemover: (gatilho: Gatilho) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const gatilho = dialogo.tipo === "novo" ? undefined : dialogo.gatilho;
  const existente = dialogo.tipo === "editar" ? dialogo.gatilho : undefined;
  const duplicando = dialogo.tipo === "duplicar";
  const campo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

  useEffect(() => {
    const elemento = ref.current;
    const anterior = document.activeElement as HTMLElement | null;
    elemento?.showModal();
    return () => { elemento?.close(); if (anterior?.isConnected) anterior.focus(); };
  }, []);

  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const dados = new FormData(form);
    for (const nome of ["nome", "descricao", "criterio"]) {
      const controle = form.elements.namedItem(nome) as HTMLInputElement | HTMLTextAreaElement;
      controle.setCustomValidity(String(dados.get(nome)).trim() ? "" : "Preencha este campo.");
    }
    if (!form.reportValidity()) return;
    onSalvar({
      id: existente?.id ?? crypto.randomUUID(),
      nome: String(dados.get("nome")).trim(),
      descricao: String(dados.get("descricao")).trim(),
      fonte: dados.get("fonte") as Fonte,
      criterio: String(dados.get("criterio")).trim(),
      responsavel: String(dados.get("responsavel")),
      ativo: dados.has("ativo"),
      ultimaOcorrencia: existente?.ultimaOcorrencia ?? "Ainda não ocorreu",
      leads: existente?.leads ?? 0,
    });
  }

  return (
    <dialog ref={ref} aria-labelledby="titulo-dialogo" onCancel={onFechar} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-xl backdrop:bg-navy/40" onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onFechar();
    }}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="titulo-dialogo" className="text-lg font-semibold text-navy">{dialogo.tipo === "novo" ? "Novo gatilho" : duplicando ? "Duplicar gatilho" : dialogo.tipo === "editar" ? "Editar gatilho" : "Remover gatilho?"}</h2>
        <button type="button" aria-label="Fechar" title="Fechar" onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>
      {dialogo.tipo === "remover" ? (
        <>
          <p className="text-sm">O gatilho <strong>{dialogo.gatilho.nome}</strong> será removido da lista. Os leads já gerados serão mantidos.</p>
          <div className="mt-6 flex justify-end gap-3">
            <Botao variante="secundario" onClick={onFechar}>Cancelar</Botao>
            <Botao variante="perigo" onClick={() => onRemover(dialogo.gatilho)}><Trash2 className="h-4 w-4" />Remover</Botao>
          </div>
        </>
      ) : (
        <form onSubmit={salvar} className="space-y-4" onInput={(event) => {
          const alvo = event.target;
          if (alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement) alvo.setCustomValidity("");
        }}>
          <label className="block text-sm font-medium">Nome do gatilho<input autoFocus name="nome" required maxLength={100} defaultValue={duplicando ? `${gatilho?.nome.slice(0, 92)} (cópia)` : gatilho?.nome} className={campo} /></label>
          <label className="block text-sm font-medium">Descrição<input name="descricao" required maxLength={180} defaultValue={gatilho?.descricao} className={campo} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Fonte<select name="fonte" defaultValue={gatilho?.fonte ?? "CNO"} className={campo}>{Object.entries(FONTE_ROTULO).map(([codigo, nome]) => <option key={codigo} value={codigo}>{nome}</option>)}</select></label>
            <label className="block text-sm font-medium">Responsável<select name="responsavel" required defaultValue={existente?.responsavel || responsaveis[0] || ""} className={campo}><option value="" disabled>Selecione um responsável</option>{responsaveis.map((nome) => <option key={nome}>{nome}</option>)}</select></label>
          </div>
          <label className="block text-sm font-medium">Critério<textarea name="criterio" required maxLength={300} rows={3} defaultValue={gatilho?.criterio} className={campo} /></label>
          <label className="flex items-center gap-2 text-sm"><input name="ativo" type="checkbox" defaultChecked={duplicando ? false : gatilho?.ativo ?? true} className="h-4 w-4 accent-blue-600" />Gatilho ativo</label>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
            <Botao type="submit"><Save className="h-4 w-4" />Salvar gatilho</Botao>
          </div>
        </form>
      )}
    </dialog>
  );
}
