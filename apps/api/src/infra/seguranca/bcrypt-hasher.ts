import bcrypt from "bcryptjs";
import type { HasherSenha } from "../../ports/hasher.js";

export const bcryptHasher: HasherSenha = {
  gerar: (senha) => bcrypt.hash(senha, 10),
  comparar: (senha, hash) => bcrypt.compare(senha, hash),
};
