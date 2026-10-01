-- CreateEnum
CREATE TYPE "ModoOperacao" AS ENUM ('COPILOTO', 'AUTOPILOT');

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "CodigoGatilho" AS ENUM ('CNO', 'PNCP', 'CNPJ_NOVO');

-- CreateEnum
CREATE TYPE "EstagioLead" AS ENUM ('DETECTADO', 'APTO', 'AGUARDANDO_APROVACAO', 'EM_CADENCIA', 'ENGAJADO', 'QUALIFICANDO', 'REUNIAO_MARCADA', 'REUNIAO_REALIZADA', 'GANHO', 'PERDIDO', 'SUPRIMIDO', 'DESQUALIFICADO', 'SEM_CONTATO', 'NUTRICAO', 'RECICLADO');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "Direcao" AS ENUM ('SAIDA', 'ENTRADA');

-- CreateEnum
CREATE TYPE "StatusMensagem" AS ENUM ('RASCUNHO', 'APROVADA', 'ENVIADA', 'RESPONDIDA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "StatusReuniao" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ResultadoDesfecho" AS ENUM ('REUNIAO_REALIZADA', 'NEGOCIO_FECHADO', 'PERDIDO', 'DESQUALIFICADO');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plano" TEXT NOT NULL DEFAULT 'piloto',
    "modoOperacao" "ModoOperacao" NOT NULL DEFAULT 'COPILOTO',
    "vozMarca" TEXT NOT NULL DEFAULT 'consultivo',
    "assinaturaEmail" TEXT,
    "calendarioProvedor" TEXT,
    "calendarioConectado" BOOLEAN NOT NULL DEFAULT false,
    "condicoesParada" TEXT[] DEFAULT ARRAY['RESPONDEU', 'OPT_OUT', 'REUNIAO_MARCADA']::TEXT[],
    "taxaConversaoHist" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'VENDEDOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilICP" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "cnaes" TEXT[],
    "portes" TEXT[],
    "cidadeBase" TEXT NOT NULL,
    "ufBase" TEXT NOT NULL,
    "latBase" DOUBLE PRECISION NOT NULL,
    "lngBase" DOUBLE PRECISION NOT NULL,
    "raioKm" INTEGER NOT NULL,
    "idadeMinAnos" INTEGER NOT NULL DEFAULT 0,
    "idadeMaxAnos" INTEGER NOT NULL DEFAULT 50,
    "situacaoExigida" TEXT NOT NULL DEFAULT 'ATIVA',
    "fontesAtivas" TEXT[] DEFAULT ARRAY['CNO', 'PNCP', 'CNPJ_NOVO']::TEXT[],

    CONSTRAINT "PerfilICP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassoCadencia" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "dia" INTEGER NOT NULL,
    "canal" "Canal" NOT NULL,
    "titulo" TEXT NOT NULL,

    CONSTRAINT "PassoCadencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoDeGatilho" (
    "id" TEXT NOT NULL,
    "codigo" "CodigoGatilho" NOT NULL,
    "nome" TEXT NOT NULL,
    "janelaFrescorDias" INTEGER NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TipoDeGatilho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaAlvo" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnae" TEXT NOT NULL,
    "cnaeDescricao" TEXT NOT NULL,
    "porte" TEXT NOT NULL,
    "situacao" TEXT NOT NULL,
    "dataInicioAtividade" TIMESTAMP(3) NOT NULL,
    "uf" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "bairro" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "telefone" TEXT,
    "email" TEXT,
    "qsa" JSONB NOT NULL DEFAULT '[]',
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaAlvo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoDeGatilho" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "detectadoEm" TIMESTAMP(3) NOT NULL,
    "resumo" TEXT NOT NULL,
    "dadosBrutos" JSONB NOT NULL,

    CONSTRAINT "EventoDeGatilho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contato" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "email" TEXT,
    "telefone" TEXT,

    CONSTRAINT "Contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supressao" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "motivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supressao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "estagio" "EstagioLead" NOT NULL DEFAULT 'DETECTADO',
    "scorePrioridade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forcaFit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "donoId" TEXT,
    "necessidade" BOOLEAN NOT NULL DEFAULT false,
    "momento" BOOLEAN NOT NULL DEFAULT false,
    "encaixe" BOOLEAN NOT NULL DEFAULT false,
    "qualificacaoForcada" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "contatoId" TEXT,
    "canal" "Canal" NOT NULL,
    "direcao" "Direcao" NOT NULL,
    "status" "StatusMensagem" NOT NULL,
    "assunto" TEXT,
    "conteudo" TEXT NOT NULL,
    "geradaPorIA" BOOLEAN NOT NULL DEFAULT false,
    "passo" INTEGER,
    "quente" BOOLEAN NOT NULL DEFAULT false,
    "aprovadaPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadaEm" TIMESTAMP(3),

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reuniao" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "vendedorId" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "status" "StatusReuniao" NOT NULL DEFAULT 'AGENDADA',
    "briefing" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reuniao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Desfecho" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "resultado" "ResultadoDesfecho" NOT NULL,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Desfecho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_clienteId_idx" ON "Usuario"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilICP_clienteId_key" ON "PerfilICP"("clienteId");

-- CreateIndex
CREATE INDEX "PassoCadencia_clienteId_idx" ON "PassoCadencia"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoDeGatilho_codigo_key" ON "TipoDeGatilho"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaAlvo_cnpj_key" ON "EmpresaAlvo"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "EventoDeGatilho_externalId_key" ON "EventoDeGatilho"("externalId");

-- CreateIndex
CREATE INDEX "EventoDeGatilho_empresaId_idx" ON "EventoDeGatilho"("empresaId");

-- CreateIndex
CREATE INDEX "Contato_empresaId_idx" ON "Contato"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Supressao_email_key" ON "Supressao"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Supressao_telefone_key" ON "Supressao"("telefone");

-- CreateIndex
CREATE INDEX "Lead_clienteId_estagio_idx" ON "Lead"("clienteId", "estagio");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_clienteId_empresaId_key" ON "Lead"("clienteId", "empresaId");

-- CreateIndex
CREATE INDEX "Mensagem_leadId_idx" ON "Mensagem"("leadId");

-- CreateIndex
CREATE INDEX "Mensagem_status_idx" ON "Mensagem"("status");

-- CreateIndex
CREATE INDEX "Reuniao_leadId_idx" ON "Reuniao"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Desfecho_leadId_key" ON "Desfecho"("leadId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilICP" ADD CONSTRAINT "PerfilICP_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassoCadencia" ADD CONSTRAINT "PassoCadencia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoDeGatilho" ADD CONSTRAINT "EventoDeGatilho_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "EmpresaAlvo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoDeGatilho" ADD CONSTRAINT "EventoDeGatilho_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoDeGatilho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contato" ADD CONSTRAINT "Contato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "EmpresaAlvo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "EmpresaAlvo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoDeGatilho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_aprovadaPorId_fkey" FOREIGN KEY ("aprovadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reuniao" ADD CONSTRAINT "Reuniao_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reuniao" ADD CONSTRAINT "Reuniao_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Desfecho" ADD CONSTRAINT "Desfecho_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
