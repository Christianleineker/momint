// Erros de aplicação com status HTTP associado. Os serviços lançam estes
// erros; o error handler HTTP os traduz em respostas.
export abstract class ErroAplicacao extends Error {
  abstract readonly status: number;
  abstract readonly codigo: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EntradaInvalida extends ErroAplicacao {
  readonly status = 400;
  readonly codigo = "ENTRADA_INVALIDA";
}

export class NaoAutenticado extends ErroAplicacao {
  readonly status = 401;
  readonly codigo = "NAO_AUTENTICADO";
}

export class AcessoNegado extends ErroAplicacao {
  readonly status = 403;
  readonly codigo = "ACESSO_NEGADO";
}

export class NaoEncontrado extends ErroAplicacao {
  readonly status = 404;
  readonly codigo = "NAO_ENCONTRADO";
}

/** Conflito com o estado atual (ex.: transição de estágio inválida). */
export class Conflito extends ErroAplicacao {
  readonly status = 409;
  readonly codigo = "CONFLITO";
}

/** Violação de regra de negócio (ex.: abordagem sem citar o gatilho). */
export class RegraDeNegocio extends ErroAplicacao {
  readonly status = 422;
  readonly codigo = "REGRA_DE_NEGOCIO";
}
