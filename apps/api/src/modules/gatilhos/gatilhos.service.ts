// Regras de monitoramento de gatilhos ("Meus gatilhos"). Toda regra nasce ativa;
// pausar ou ativar é uma ação separada, e editar mantém a situação atual.
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { DadosRegraGatilho } from "../../infra/database/repositories/regra-gatilho.repository.js";
import { Conflito, EntradaInvalida, NaoEncontrado, RegraDeNegocio } from "../../shared/erros.js";

export class GatilhosService {
  constructor(private readonly repos: Repositorios) {}

  /** Regras do cliente com a última detecção da fonte e os leads que ela gerou. */
  async listar(clienteId: string) {
    const [regras, ultimas, leads] = await Promise.all([
      this.repos.regrasGatilho.listarDoCliente(clienteId),
      this.repos.regrasGatilho.ultimaDeteccaoPorFonte(clienteId),
      this.repos.regrasGatilho.leadsPorFonte(clienteId),
    ]);
    return regras.map((r) => ({
      id: r.id,
      nome: r.nome,
      descricao: r.descricao,
      fonte: r.fonte,
      criterio: r.criterio,
      ativo: r.ativo,
      responsavel: r.responsavel,
      ultimaOcorrencia: ultimas.get(r.fonte) ?? null,
      leadsGerados: leads.get(r.fonte) ?? 0,
    }));
  }

  async criar(clienteId: string, dados: DadosRegraGatilho) {
    await this.validarResponsavel(clienteId, dados.responsavelId);
    return this.repos.regrasGatilho.criar(clienteId, dados);
  }

  async atualizar(clienteId: string, id: string, dados: DadosRegraGatilho) {
    await this.buscar(clienteId, id);
    await this.validarResponsavel(clienteId, dados.responsavelId, id);
    return this.repos.regrasGatilho.atualizar(id, dados);
  }

  async alterarSituacao(clienteId: string, id: string, ativo: boolean) {
    const regra = await this.buscar(clienteId, id);
    if (ativo && !regra.responsavelId) throw new RegraDeNegocio("Defina um responsável antes de ativar o gatilho");
    return this.repos.regrasGatilho.atualizar(id, { ativo });
  }

  async remover(clienteId: string, id: string) {
    await this.buscar(clienteId, id);
    await this.repos.regrasGatilho.excluir(id);
  }

  private async buscar(clienteId: string, id: string) {
    const regra = await this.repos.regrasGatilho.buscarDoCliente(clienteId, id);
    if (!regra) throw new NaoEncontrado("Gatilho não encontrado");
    return regra;
  }

  /** O responsável precisa ser da equipe, estar ativo e não cuidar de outra regra. */
  private async validarResponsavel(clienteId: string, responsavelId: string | null, ignorarId?: string) {
    if (!responsavelId) return;
    const usuario = await this.repos.usuarios.buscarDoCliente(clienteId, responsavelId);
    if (!usuario || !usuario.ativo) throw new EntradaInvalida("Responsável não encontrado na equipe deste sistema");
    if (await this.repos.regrasGatilho.responsavelOcupado(clienteId, responsavelId, ignorarId)) {
      throw new Conflito("Este responsável já cuida de outro gatilho. Escolha outra pessoa.");
    }
  }
}
