export const nomeEmpresa = (e: { nomeFantasia: string | null; razaoSocial: string }) => e.nomeFantasia ?? e.razaoSocial;

/** CNPJ mascarado para exibição: 11.222.***\/0001-81 */
export const mascararCnpj = (c: string) => `${c.slice(0, 2)}.${c.slice(2, 5)}.***/${c.slice(8, 12)}-${c.slice(12)}`;
