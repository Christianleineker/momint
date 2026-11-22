import { Building2, FileText, HardHat, Zap } from "lucide-react";
import { Badge, FONTE_ROTULO, FONTE_TOM, PRIORIDADE_ROTULO, PRIORIDADE_TOM } from "./ui";

/** Ícone por tipo de gatilho: capacete para obra, documento para licitação, prédio para CNPJ novo. */
export const ICONE_GATILHO = { CNO: HardHat, PNCP: FileText, CNPJ_NOVO: Building2 } as const;

export function iconeGatilho(codigo: string) {
  return ICONE_GATILHO[codigo as keyof typeof ICONE_GATILHO] ?? Zap;
}

export function SeloGatilho({ codigo }: { codigo: string }) {
  const Icone = iconeGatilho(codigo);
  return <Badge tom={FONTE_TOM[codigo] ?? "cinza"}><Icone aria-hidden="true" className="mr-1 h-3.5 w-3.5" />{FONTE_ROTULO[codigo] ?? codigo}</Badge>;
}

export function SeloPrioridade({ prioridade }: { prioridade: string }) {
  return <Badge tom={PRIORIDADE_TOM[prioridade] ?? "cinza"}>{PRIORIDADE_ROTULO[prioridade] ?? prioridade}</Badge>;
}
