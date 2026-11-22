import type { DbClient } from "../prisma.js";
import { CadenciaRepository } from "./cadencia.repository.js";
import { ClienteRepository } from "./cliente.repository.js";
import { EmpresaRepository } from "./empresa.repository.js";
import { EventoRepository } from "./evento.repository.js";
import { LeadRepository } from "./lead.repository.js";
import { MensagemRepository } from "./mensagem.repository.js";
import { PerfilIcpRepository } from "./perfil-icp.repository.js";
import { ReuniaoRepository } from "./reuniao.repository.js";
import { SupressaoRepository } from "./supressao.repository.js";
import { UsuarioRepository } from "./usuario.repository.js";
import { RecuperacaoSenhaRepository } from "./recuperacao-senha.repository.js";
import { TentativaLoginRepository } from "./tentativa-login.repository.js";
import { RegraGatilhoRepository } from "./regra-gatilho.repository.js";
import { LeituraNotificacaoRepository } from "./leitura-notificacao.repository.js";
import { CnaeRepository } from "./cnae.repository.js";
import { OfertaRepository } from "./oferta.repository.js";

/** Conjunto de repositórios ligados a um mesmo cliente de banco (ou transação). */
export function criarRepositorios(db: DbClient) {
  return {
    clientes: new ClienteRepository(db),
    usuarios: new UsuarioRepository(db),
    recuperacoes: new RecuperacaoSenhaRepository(db),
    tentativasLogin: new TentativaLoginRepository(db),
    icp: new PerfilIcpRepository(db),
    cadencia: new CadenciaRepository(db),
    empresas: new EmpresaRepository(db),
    eventos: new EventoRepository(db),
    supressoes: new SupressaoRepository(db),
    leads: new LeadRepository(db),
    mensagens: new MensagemRepository(db),
    reunioes: new ReuniaoRepository(db),
    regrasGatilho: new RegraGatilhoRepository(db),
    leiturasNotificacao: new LeituraNotificacaoRepository(db),
    cnaes: new CnaeRepository(db),
    ofertas: new OfertaRepository(db),
  };
}

export type Repositorios = ReturnType<typeof criarRepositorios>;
