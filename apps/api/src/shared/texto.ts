/** "São José dos Pinhais" → "SAO JOSE DOS PINHAIS" */
export const normalizarMunicipio = (m: string) => m.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
