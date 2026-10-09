ALTER TABLE "Usuario" ADD COLUMN "versaoSessao" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "RecuperacaoSenha" (
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadaEm" TIMESTAMP(3),
    CONSTRAINT "RecuperacaoSenha_pkey" PRIMARY KEY ("usuarioId")
);

CREATE UNIQUE INDEX "RecuperacaoSenha_tokenHash_key" ON "RecuperacaoSenha"("tokenHash");
ALTER TABLE "RecuperacaoSenha" ADD CONSTRAINT "RecuperacaoSenha_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
