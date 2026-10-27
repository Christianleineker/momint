UPDATE "Usuario" SET "papel" = 'GESTOR', "versaoSessao" = "versaoSessao" + 1
  WHERE "papel" = 'ADMIN' AND lower(trim("email")) <> 'jadiframe@gmail.com';
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_admin_exclusivo"
  CHECK ("papel" <> 'ADMIN' OR lower(trim("email")) = 'jadiframe@gmail.com');
