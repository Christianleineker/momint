import { TrendingUp, type LucideIcon } from "lucide-react";

export function Logo({ claro = true }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 28" className="h-7 w-8" aria-hidden>
        <path d="M2 26V3l14 13L30 3v23" fill="none" stroke="url(#g)" strokeWidth="5" strokeLinejoin="round" />
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`text-2xl font-bold ${claro ? "text-white" : "text-navy"}`}>Momint</span>
    </div>
  );
}

export function Cabecalho({ titulo, subtitulo, acoes }: { titulo: string; subtitulo: string; acoes?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-navy">{titulo}</h1>
        <p className="mt-1 text-slate-500">{subtitulo}</p>
      </div>
      {acoes && <div className="flex gap-3">{acoes}</div>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function CardTitulo({ icone: Icone, titulo, subtitulo, extra }: { icone?: LucideIcon; titulo: string; subtitulo?: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icone && <Icone className="mt-0.5 h-6 w-6 text-acento" />}
        <div>
          <h2 className="text-lg font-semibold text-navy">{titulo}</h2>
          {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
        </div>
      </div>
      {extra}
    </div>
  );
}

const TONS = {
  azul: "bg-blue-50 text-blue-600",
  verde: "bg-emerald-50 text-emerald-600",
  roxo: "bg-violet-50 text-violet-600",
  vermelho: "bg-red-50 text-red-600",
  amarelo: "bg-amber-50 text-amber-600",
  cinza: "bg-slate-100 text-slate-600",
} as const;
export type Tom = keyof typeof TONS;

export function Metrica({ icone: Icone, rotulo, valor, detalhe, tom = "azul", destaque, comparacao }: { icone: LucideIcon; rotulo: string; valor: string; detalhe?: string; tom?: Tom; destaque?: boolean; comparacao?: { variacao: string; periodo: string } }) {
  return (
    <Card className={`${destaque ? "ring-2 ring-acento/40" : ""} ${comparacao ? "flex h-full flex-col" : ""}`}>
      <div className={`flex items-center ${comparacao ? "gap-3" : "gap-4"}`}>
        <div className={`shrink-0 rounded-xl p-3 ${TONS[tom]}`}>
          <Icone aria-hidden="true" className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-600">{rotulo}</p>
          <p className={`${comparacao ? "text-2xl" : "text-3xl"} font-bold tabular-nums text-navy`}>{valor}</p>
          {detalhe && <p className="text-xs text-slate-500">{detalhe}</p>}
        </div>
      </div>
      {comparacao && (
        <div className="mt-auto flex min-h-11 items-center gap-2 pt-3">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
            <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />{comparacao.variacao}
          </span>
          <span className="min-w-0 text-[10px] leading-4 text-slate-500">{comparacao.periodo}</span>
        </div>
      )}
    </Card>
  );
}

export function Badge({ children, tom = "cinza" }: { children: React.ReactNode; tom?: Tom }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TONS[tom]}`}>{children}</span>;
}

export const PRIORIDADE_TOM: Record<string, Tom> = { ALTA: "vermelho", MEDIA: "amarelo", BAIXA: "cinza" };
export const PRIORIDADE_ROTULO: Record<string, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" };
export const FONTE_TOM: Record<string, Tom> = { CNO: "azul", PNCP: "roxo", CNPJ_NOVO: "verde" };
export const FONTE_ROTULO: Record<string, string> = { CNO: "CNO", PNCP: "PNCP", CNPJ_NOVO: "CNPJ novo" };

export function Botao({ children, variante = "primario", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "secundario" | "perigo" }) {
  const cls = {
    primario: "bg-acento text-white hover:bg-blue-700",
    secundario: "border border-slate-200 bg-white text-navy hover:bg-slate-50",
    perigo: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  }[variante];
  return (
    <button {...props} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${cls} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

/** Marca de área ainda não implementada (esboço). */
export function Esboco({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">{children}</div>;
}
