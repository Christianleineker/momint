ALTER TYPE "Papel" ADD VALUE 'GESTOR';
ALTER TYPE "Papel" ADD VALUE 'ATENDENTE';
CREATE TABLE "ContaCliente" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "documento" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "excluidoEm" TIMESTAMP(3)
);
ALTER TABLE "Cliente" ADD COLUMN "contaClienteId" TEXT,
  ADD COLUMN "demonstrativo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Cliente_contaClienteId_idx" ON "Cliente"("contaClienteId");
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_contaClienteId_fkey"
  FOREIGN KEY ("contaClienteId") REFERENCES "ContaCliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Preserva os sistemas existentes. A preparação do admin identifica a demonstração.
INSERT INTO "ContaCliente" ("id", "nome", "criadoEm")
  SELECT 'conta_' || "id", "nome", "criadoEm" FROM "Cliente";
UPDATE "Cliente" SET "contaClienteId" = 'conta_' || "id";
