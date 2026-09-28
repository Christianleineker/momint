// Composition root: monta repositórios, portas e serviços (injeção de dependências).
import type { PrismaClient } from "@prisma/client";
import { criarRepositorios } from "./infra/database/repositories/index.js";
import { UnitOfWork } from "./infra/database/unit-of-work.js";
import { geocodificadorMunicipios } from "./infra/geocodificacao/municipios.js";
import { bcryptHasher } from "./infra/seguranca/bcrypt-hasher.js";
import type { FontesPublicas } from "./ports/fontes-publicas.js";
import type { Geocodificador } from "./ports/geocodificador.js";
import type { HasherSenha } from "./ports/hasher.js";
import type { Relogio } from "./ports/relogio.js";
import { AbordagemService } from "./modules/abordagem/abordagem.service.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { CadenciaService } from "./modules/cadencia/cadencia.service.js";
import { ConfiguracoesService } from "./modules/configuracoes/configuracoes.service.js";
import { SupressaoService } from "./modules/contatos/supressao.service.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { IcpService } from "./modules/icp/icp.service.js";
import { LeadsService } from "./modules/leads/leads.service.js";
import { RadarService } from "./modules/radar/radar.service.js";
import { ReunioesService } from "./modules/reunioes/reunioes.service.js";
import { UsuariosService } from "./modules/usuarios/usuarios.service.js";

export interface Dependencias {
  prisma: PrismaClient;
  fontes: FontesPublicas;
  relogio: Relogio;
  geocodificador?: Geocodificador;
  hasher?: HasherSenha;
}

export function criarContainer({ prisma, fontes, relogio, geocodificador = geocodificadorMunicipios, hasher = bcryptHasher }: Dependencias) {
  const repos = criarRepositorios(prisma);
  const uow = new UnitOfWork(prisma);

  const supressao = new SupressaoService(repos, uow);
  const abordagem = new AbordagemService(repos, uow, supressao, relogio);
  const leads = new LeadsService(repos, uow, supressao, relogio);
  const reunioes = new ReunioesService(repos, uow, leads);
  const radar = new RadarService(repos, fontes, geocodificador, relogio, abordagem);

  return {
    auth: new AuthService(repos, hasher),
    dashboard: new DashboardService(repos, relogio),
    radar,
    leads,
    abordagem,
    supressao,
    reunioes,
    cadencia: new CadenciaService(repos, uow),
    icp: new IcpService(repos, geocodificador, radar),
    configuracoes: new ConfiguracoesService(repos),
    usuarios: new UsuariosService(repos, hasher),
  };
}

export type Container = ReturnType<typeof criarContainer>;

/** Relógio do sistema; com `dataFixa` (YYYY-MM-DD) devolve sempre o meio-dia UTC dessa data. */
export const criarRelogio = (dataFixa?: string): Relogio => ({
  agora: () => (dataFixa ? new Date(`${dataFixa}T12:00:00Z`) : new Date()),
});
