// Utilitários de aplicação compartilhados entre módulos que lidam com gatilhos.
import type { Prisma } from "@prisma/client";
import type { CodigoGatilho } from "../../domain/gatilho/dados-publicos.js";
import { agruparGatilhosAtivos } from "../../domain/gatilho/frescor.js";
import type { ContextoGatilho } from "../../domain/mensagem/referencias.js";
import type { Repositorios } from "../../infra/database/repositories/index.js";

/** Evento persistido → contexto de domínio usado pelo compositor/validação. */
export function contextoDoGatilho(ev: { detectadoEm: Date; dadosBrutos: Prisma.JsonValue; tipo: { codigo: CodigoGatilho } }): ContextoGatilho {
  return { codigo: ev.tipo.codigo, detectadoEm: ev.detectadoEm, dadosBrutos: ev.dadosBrutos };
}

/** Gatilhos ainda frescos por empresa (define empilhamento e prioridade). */
export async function gatilhosAtivosPorEmpresa(repos: Repositorios, empresaIds: string[], hoje: Date) {
  return agruparGatilhosAtivos(await repos.eventos.listarDasEmpresas(empresaIds), hoje);
}
