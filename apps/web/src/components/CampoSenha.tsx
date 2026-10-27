"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export function CampoSenha({ nome = "senha", rotulo = "Senha", placeholder = "Digite sua senha", autoComplete = "current-password", minLength, required = true, value, onChange }: { nome?: string; rotulo?: string; placeholder?: string; autoComplete?: "current-password" | "new-password"; minLength?: number; required?: boolean; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement> }) {
  const id = useId();
  const [mostrar, setMostrar] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{rotulo}</label>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 transition focus-within:border-acento focus-within:ring-2 focus-within:ring-blue-100">
        <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
        <input id={id} name={nome} type={mostrar ? "text" : "password"} placeholder={placeholder} autoComplete={autoComplete} required={required} minLength={minLength} maxLength={autoComplete === "new-password" ? 72 : undefined} value={value} onChange={onChange} className="min-w-0 flex-1 outline-none" />
        <button type="button" aria-label={`${mostrar ? "Ocultar" : "Mostrar"} ${rotulo.toLocaleLowerCase("pt-BR")}`} title={mostrar ? "Ocultar senha" : "Mostrar senha"} aria-pressed={mostrar} onClick={() => setMostrar((valor) => !valor)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 hover:text-acento focus-visible:outline-2 focus-visible:outline-acento">
          {mostrar ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
