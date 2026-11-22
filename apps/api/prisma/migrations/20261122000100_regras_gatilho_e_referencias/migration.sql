-- CreateTable
CREATE TABLE "RegraGatilho" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fonte" "CodigoGatilho" NOT NULL,
    "criterio" TEXT NOT NULL,
    "responsavelId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraGatilho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeituraNotificacao" (
    "usuarioId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "lidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeituraNotificacao_pkey" PRIMARY KEY ("usuarioId","chave")
);

-- CreateTable
CREATE TABLE "Cnae" (
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "Cnae_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Municipio" (
    "nome" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Municipio_pkey" PRIMARY KEY ("nome","uf")
);

-- CreateIndex
CREATE INDEX "RegraGatilho_clienteId_idx" ON "RegraGatilho"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "RegraGatilho_clienteId_responsavelId_key" ON "RegraGatilho"("clienteId", "responsavelId");

-- AddForeignKey
ALTER TABLE "RegraGatilho" ADD CONSTRAINT "RegraGatilho_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraGatilho" ADD CONSTRAINT "RegraGatilho_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeituraNotificacao" ADD CONSTRAINT "LeituraNotificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Dados de referência (antes fixos no código). Idempotentes: não duplicam o que já existe.
INSERT INTO "TipoDeGatilho" ("id", "codigo", "nome", "janelaFrescorDias", "peso") VALUES
    ('tipo_cno', 'CNO', 'Nova obra (CNO)', 60, 1.0),
    ('tipo_pncp', 'PNCP', 'Licitação (PNCP)', 30, 0.8),
    ('tipo_cnpj_novo', 'CNPJ_NOVO', 'Empresa nova (CNPJ)', 45, 0.6)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "Cnae" ("codigo", "descricao") VALUES
    ('4120400', 'Construção de edifícios'),
    ('4110700', 'Incorporação de empreendimentos imobiliários'),
    ('4299599', 'Outras obras de engenharia civil'),
    ('4211101', 'Construção de rodovias e ferrovias'),
    ('4330499', 'Outros serviços de acabamento em construção'),
    ('4391600', 'Obras de fundações')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "Municipio" ("nome", "uf", "lat", "lng") VALUES
    ('CURITIBA', 'PR', -25.4284, -49.2733),
    ('SAO JOSE DOS PINHAIS', 'PR', -25.5347, -49.2064),
    ('COLOMBO', 'PR', -25.2917, -49.2242),
    ('PINHAIS', 'PR', -25.4447, -49.1925),
    ('ARAUCARIA', 'PR', -25.5926, -49.4103),
    ('PARANAGUA', 'PR', -25.5163, -48.5225),
    ('CAMPO LARGO', 'PR', -25.459, -49.528),
    ('ALMIRANTE TAMANDARE', 'PR', -25.325, -49.31),
    ('FAZENDA RIO GRANDE', 'PR', -25.662, -49.307)
ON CONFLICT ("nome", "uf") DO NOTHING;
