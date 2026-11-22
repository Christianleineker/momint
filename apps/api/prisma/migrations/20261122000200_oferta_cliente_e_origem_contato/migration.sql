-- O que o cliente vende (base da abordagem e do briefing) e a origem de cada contato.

-- CreateEnum
CREATE TYPE "OrigemContato" AS ENUM ('RECEITA_FEDERAL', 'MANUAL');

-- AlterTable
ALTER TABLE "Contato" ADD COLUMN "origem" "OrigemContato" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "OfertaCliente" (
    "clienteId" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "proposta" TEXT NOT NULL,
    "beneficio" TEXT NOT NULL,
    "compradores" TEXT NOT NULL,
    "pauta" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfertaCliente_pkey" PRIMARY KEY ("clienteId")
);

-- AddForeignKey
ALTER TABLE "OfertaCliente" ADD CONSTRAINT "OfertaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
