/** Executa `tarefa` para cada item, no máximo `simultaneas` por vez, mantendo a ordem. */
export async function emLotes<T, R>(itens: T[], simultaneas: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = [];
  for (let i = 0; i < itens.length; i += simultaneas) {
    resultados.push(...(await Promise.all(itens.slice(i, i + simultaneas).map(tarefa))));
  }
  return resultados;
}
