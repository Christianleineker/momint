"use client";

import { useEffect, useRef, useState } from "react";
import { ouvirCarregamento } from "@/lib/carregamento";
import { MarcaMomint } from "@/components/ui";

/** Só aparece se a requisição passar deste tempo (evita piscar em respostas rápidas). */
const ATRASO_MS = 250;
/** Uma vez visível, fica pelo menos este tempo (evita sumir num piscar de olhos). */
const MINIMO_VISIVEL_MS = 400;

/** Spinner global do Momint. Liga sozinho enquanto o serviço `carregamento` tiver
 *  requisições pendentes. Fica na camada superior (popover) para cobrir até modais. */
export function IndicadorCarregamento() {
  const [visivel, setVisivel] = useState(false);
  const camada = useRef<HTMLDivElement>(null);
  const exibidoDesde = useRef(0);
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => ouvirCarregamento((pendentes) => {
    window.clearTimeout(temporizador.current);
    if (pendentes > 0) {
      temporizador.current = window.setTimeout(() => {
        exibidoDesde.current = Date.now();
        setVisivel(true);
      }, ATRASO_MS);
    } else {
      const restante = exibidoDesde.current ? MINIMO_VISIVEL_MS - (Date.now() - exibidoDesde.current) : 0;
      temporizador.current = window.setTimeout(() => {
        exibidoDesde.current = 0;
        setVisivel(false);
      }, Math.max(0, restante));
    }
  }), []);

  useEffect(() => {
    const elemento = camada.current;
    if (!elemento || typeof elemento.showPopover !== "function") return;
    if (elemento.matches(":popover-open")) elemento.hidePopover();
    if (visivel) elemento.showPopover();
  }, [visivel]);

  return (
    <div
      ref={camada}
      popover="manual"
      role="status"
      aria-live="polite"
      aria-label="Carregando"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none place-items-center border-0 bg-white/50 p-0 backdrop-blur-[1px] [&:not(:popover-open)]:hidden [&:popover-open]:grid"
    >
      <div className="carregamento-entrar flex flex-col items-center gap-3 rounded-2xl bg-white px-7 py-6 shadow-xl ring-1 ring-slate-200">
        <div className="relative h-14 w-14">
          <span className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-r-teal border-t-acento" />
          <MarcaMomint className="absolute inset-0 m-auto h-7 w-7 rounded-md" />
        </div>
        <p className="text-sm font-medium text-navy">Carregando...</p>
      </div>
    </div>
  );
}
