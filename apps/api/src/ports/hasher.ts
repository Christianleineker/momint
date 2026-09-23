export interface HasherSenha {
  gerar(senha: string): Promise<string>;
  comparar(senha: string, hash: string): Promise<boolean>;
}
