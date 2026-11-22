// Estado de leitura das notificações do painel, guardado por usuário.
import type { Repositorios } from "../../infra/database/repositories/index.js";

export class NotificacoesService {
  constructor(private readonly repos: Repositorios) {}

  lidas(usuarioId: string) {
    return this.repos.leiturasNotificacao.listarChaves(usuarioId);
  }

  marcarLidas(usuarioId: string, chaves: string[]) {
    return this.repos.leiturasNotificacao.marcar(usuarioId, chaves);
  }
}
