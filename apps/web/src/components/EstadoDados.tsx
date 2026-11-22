"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/** Estados de uma leitura da API. Enquanto carrega (inclusive nas novas tentativas
 *  automáticas depois de uma falha), quem aparece é o spinner global, nunca o erro.
 *  O erro com "Tentar novamente" só aparece quando o carregamento terminou sem sucesso. */
export function EstadoDados({ erro, carregando, tentar }: { erro?: Error; carregando?: boolean; tentar: () => unknown; texto?: string }) {
  if (carregando) return null;
  if (erro) {
    return (
      <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Não foi possível carregar os dados. <button type="button" className="font-medium underline" onClick={() => void tentar()}>Tentar novamente</button>
      </div>
    );
  }
  return null;
}

/** Estado vazio: ícone, frase curta e, se houver, a ação. */
export function Vazio({ icone: Icone = Inbox, titulo, texto, acao }: { icone?: LucideIcon; titulo: string; texto?: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
      <Icone aria-hidden="true" className="h-9 w-9 text-slate-300" />
      <p className="font-medium text-navy">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-slate-500">{texto}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
