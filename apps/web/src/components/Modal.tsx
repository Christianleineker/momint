"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function Modal({ titulo, children, ocupado, fechar }: { titulo: string; children: React.ReactNode; ocupado: boolean; fechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialogo = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogo?.showModal();
    return () => { dialogo?.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={ref} aria-labelledby={id} onCancel={e => { e.preventDefault(); if (!ocupado) fechar(); }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border-0 bg-white p-6 text-slate-800 shadow-xl backdrop:bg-navy/45"><div className="mb-5 flex items-center justify-between gap-3"><h2 id={id} className="text-xl font-bold text-navy">{titulo}</h2><button type="button" aria-label="Fechar" disabled={ocupado} onClick={fechar} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button></div>{children}</dialog>;
}
