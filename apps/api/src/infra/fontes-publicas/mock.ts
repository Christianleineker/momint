// Fontes públicas em modo mock: respondem a partir das fixtures, com o mesmo
// formato das APIs reais.
import type { FonteCno, FonteCnpj, FontePncp, FontesPublicas } from "../../ports/fontes-publicas.js";
import { empresasFixture, licitacoesFixture, obrasFixture } from "./fixtures/index.js";

const soDigitos = (s: string) => s.replace(/\D/g, "");

const cnpjMock: FonteCnpj = {
  async buscar(cnpj) {
    return empresasFixture.find((e) => e.cnpj === soDigitos(cnpj)) ?? null;
  },
  async novasEmpresas(desde) {
    return empresasFixture.filter((e) => new Date(e.data_inicio_atividade) >= desde);
  },
};

const pncpMock: FontePncp = {
  async contratacoesPublicadas(desde, ate) {
    return licitacoesFixture.filter((l) => {
      const d = new Date(l.dataPublicacaoPncp);
      return d >= desde && d <= ate;
    });
  },
};

const cnoMock: FonteCno = {
  async obrasRegistradas(desde, uf) {
    return obrasFixture.filter((o) => o.uf === uf && new Date(o.dataRegistro) >= desde);
  },
};

export const fontesMock: FontesPublicas = { cnpj: cnpjMock, pncp: pncpMock, cno: cnoMock };
