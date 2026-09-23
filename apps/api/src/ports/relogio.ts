/** Fonte de "agora" injetável — permite datas fixas em demos e testes. */
export interface Relogio {
  agora(): Date;
}
