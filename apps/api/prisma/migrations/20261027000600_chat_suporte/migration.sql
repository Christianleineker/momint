CREATE TYPE "AutorSuporte" AS ENUM ('VISITANTE', 'ADMIN');
CREATE TABLE "ConversaSuporte" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "acessoHash" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "email" TEXT,
  "assunto" TEXT NOT NULL DEFAULT 'SUPORTE',
  "encerrada" BOOLEAN NOT NULL DEFAULT false,
  "pendentesAdmin" INTEGER NOT NULL DEFAULT 0,
  "pendentesVisitante" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimaMensagemEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acessoExpiraEm" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ConversaSuporte_acessoHash_key" ON "ConversaSuporte"("acessoHash");
CREATE INDEX "ConversaSuporte_ultimaMensagemEm_idx" ON "ConversaSuporte"("ultimaMensagemEm");
CREATE TABLE "MensagemSuporte" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversaId" TEXT NOT NULL,
  "autor" "AutorSuporte" NOT NULL,
  "nomeAutor" TEXT NOT NULL,
  "conteudo" TEXT NOT NULL,
  "idEnvio" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MensagemSuporte_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "ConversaSuporte"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MensagemSuporte_conversaId_idEnvio_key" ON "MensagemSuporte"("conversaId", "idEnvio");
CREATE INDEX "MensagemSuporte_conversaId_criadoEm_id_idx" ON "MensagemSuporte"("conversaId", "criadoEm", "id");
