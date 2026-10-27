ALTER TABLE "ContaCliente" ADD COLUMN "emailContato" TEXT, ADD COLUMN "telefone" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "telefone" TEXT;
CREATE TABLE "NotificacaoAdmin" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tipo" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lidaEm" TIMESTAMP(3)
);
CREATE INDEX "NotificacaoAdmin_criadoEm_idx" ON "NotificacaoAdmin"("criadoEm");
CREATE TABLE "ConfirmacaoExclusao" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "contaClienteId" TEXT NOT NULL,
  "nomeConfirmado" TEXT NOT NULL,
  "versaoSessao" INTEGER NOT NULL,
  "prontoEm" TIMESTAMP(3) NOT NULL,
  "expiraEm" TIMESTAMP(3) NOT NULL,
  "usadaEm" TIMESTAMP(3),
  CONSTRAINT "ConfirmacaoExclusao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ConfirmacaoExclusao_contaClienteId_fkey" FOREIGN KEY ("contaClienteId") REFERENCES "ContaCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConfirmacaoExclusao_tokenHash_key" ON "ConfirmacaoExclusao"("tokenHash");
CREATE INDEX "ConfirmacaoExclusao_contaClienteId_idx" ON "ConfirmacaoExclusao"("contaClienteId");
