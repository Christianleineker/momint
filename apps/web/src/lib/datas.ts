const FUSO = "America/Sao_Paulo";

/** 25/09/2026 */
export const formatarData = (iso: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: FUSO }).format(new Date(iso));

/** 25/09 · 14:00 */
export const formatarDataHora = (iso: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(new Date(iso)).replace(",", " ·");

/** 14:00 */
export const formatarHora = (iso: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(new Date(iso));

/** sex., 02/10 */
export const formatarDiaSemana = (iso: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: FUSO }).format(new Date(iso));

/** Dia no fuso de São Paulo, no formato AAAA-MM-DD (bom para comparar). */
export const diaLocal = (data: string | Date) => new Date(data).toLocaleDateString("en-CA", { timeZone: FUSO });
