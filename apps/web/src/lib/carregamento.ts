/** Serviço global de carregamento: conta as requisições em andamento. O componente
 *  <IndicadorCarregamento /> do layout raiz mostra o spinner enquanto houver alguma.
 *  Uso: `await carregamento.durante(promessa)`, ou `iniciar()` e `finalizar()` em pares. */
type Ouvinte = (pendentes: number) => void;

const ouvintes = new Set<Ouvinte>();
let pendentes = 0;

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte(pendentes));
}

export const carregamento = {
  iniciar() {
    pendentes++;
    avisar();
  },
  finalizar() {
    pendentes = Math.max(0, pendentes - 1);
    avisar();
  },
  /** Mantém o spinner ligado até a promessa terminar (com sucesso ou erro). */
  async durante<T>(promessa: Promise<T>): Promise<T> {
    carregamento.iniciar();
    try {
      return await promessa;
    } finally {
      carregamento.finalizar();
    }
  },
};

export function ouvirCarregamento(ouvinte: Ouvinte) {
  ouvintes.add(ouvinte);
  ouvinte(pendentes);
  return () => { ouvintes.delete(ouvinte); };
}
