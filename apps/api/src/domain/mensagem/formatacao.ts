export const fmtNumero = (n: number) => n.toLocaleString("pt-BR");
export const fmtMoeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const fmtData = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

/** "ÁGUA VERDE" → "Água Verde"; "MUNICÍPIO DE COLOMBO" → "Município de Colombo" */
export const titulo = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_m, esp: string, l: string) => esp + l.toUpperCase())
    .replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase());

export const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Normalização para comparação: sem acento, minúsculo, sem ponto de milhar. */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/(\d)\.(\d)/g, "$1$2")
    .replace(/\s+/g, " ");
