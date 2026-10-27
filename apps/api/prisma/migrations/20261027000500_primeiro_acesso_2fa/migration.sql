ALTER TABLE "Usuario" ADD COLUMN "primeiroAcessoPendente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "oferta2faPendente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "doisFatoresEmail" BOOLEAN NOT NULL DEFAULT false;
-- Usuários existentes mantêm o acesso; novos usuários recebem o fluxo de boas-vindas.
ALTER TABLE "Usuario" ALTER COLUMN "primeiroAcessoPendente" SET DEFAULT true,
  ALTER COLUMN "oferta2faPendente" SET DEFAULT true;
CREATE TYPE "FinalidadeCodigo" AS ENUM ('LOGIN', 'ATIVAR_2FA', 'DESATIVAR_2FA');
CREATE TABLE "DesafioEmail" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "usuarioId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "codigoHash" TEXT NOT NULL,
  "finalidade" "FinalidadeCodigo" NOT NULL,
  "versaoSessao" INTEGER NOT NULL,
  "emailDestino" TEXT NOT NULL,
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiraEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesafioEmail_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DesafioEmail_tokenHash_key" ON "DesafioEmail"("tokenHash");
CREATE INDEX "DesafioEmail_usuarioId_finalidade_idx" ON "DesafioEmail"("usuarioId", "finalidade");
CREATE INDEX "DesafioEmail_expiraEm_idx" ON "DesafioEmail"("expiraEm");
