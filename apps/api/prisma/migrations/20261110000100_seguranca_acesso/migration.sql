CREATE TABLE "TentativaLogin" (
    "chave" TEXT NOT NULL PRIMARY KEY,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3)
);

CREATE TABLE "HistoricoSenha" (
    "usuarioId" TEXT NOT NULL REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("usuarioId", "senhaHash")
);

INSERT INTO "HistoricoSenha" ("usuarioId", "senhaHash") SELECT "id", "senhaHash" FROM "Usuario";

-- Registra senhas anteriores em todos os caminhos de alteração, inclusive pelo admin.
CREATE FUNCTION registrar_historico_senha() RETURNS trigger AS $$
BEGIN
    IF NEW."senhaHash" IS DISTINCT FROM OLD."senhaHash" THEN
        INSERT INTO "HistoricoSenha" ("usuarioId", "senhaHash") VALUES (OLD."id", OLD."senhaHash")
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Usuario_historico_senha" BEFORE UPDATE OF "senhaHash" ON "Usuario"
FOR EACH ROW EXECUTE FUNCTION registrar_historico_senha();

-- A restrição única passa a valer também para diferenças de caixa e espaços.
UPDATE "Usuario" SET "email" = lower(btrim("email"));
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_email_normalizado" CHECK ("email" = lower(btrim("email")));
