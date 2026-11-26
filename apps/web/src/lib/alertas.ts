/** Serviço global de alertas (sucesso e erro). Pode ser chamado de qualquer lugar do
 *  cliente, sem hook: o componente <Alertas /> do layout raiz exibe as mensagens.
 *  Uso: alerta.sucesso("Salvo."), alerta.erro("...", { titulo: "Atenção", duracao: 10000 }),
 *  e no catch: alerta.falha(e, "Não foi possível salvar."). */
export type TipoAlerta = "sucesso" | "erro" | "aviso";
export type OpcoesAlerta = {
  /** Título do cartão. Padrão: "Sucesso" ou "Erro". */
  titulo?: string;
  /** Tempo na tela em milissegundos. Padrão: 4 s para sucesso e 7 s para erro. */
  duracao?: number;
};
export type Alerta = { id: number; tipo: TipoAlerta; texto: string } & OpcoesAlerta;
type Ouvinte = (alerta: Alerta) => void;

const ouvintes = new Set<Ouvinte>();
let proximoId = 0;

function emitir(tipo: TipoAlerta, texto: string, opcoes: OpcoesAlerta = {}) {
  const novo: Alerta = { id: ++proximoId, tipo, texto, ...opcoes };
  ouvintes.forEach((ouvinte) => ouvinte(novo));
}

export const alerta = {
  sucesso: (texto: string, opcoes?: OpcoesAlerta) => emitir("sucesso", texto, opcoes),
  aviso: (texto: string, opcoes?: OpcoesAlerta) => emitir("aviso", texto, opcoes),
  erro: (texto: string, opcoes?: OpcoesAlerta) => emitir("erro", texto, opcoes),
  /** Para usar no catch: mostra a mensagem do erro ou o texto padrão quando não houver uma útil. */
  falha: (erro: unknown, padrao = "Algo deu errado. Tente novamente.", opcoes?: OpcoesAlerta) =>
    emitir("erro", erro instanceof Error && erro.message ? erro.message : padrao, opcoes),
};

export function ouvirAlertas(ouvinte: Ouvinte) {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}
