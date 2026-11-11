import type { PrismaClient } from "@prisma/client";
import { EMAIL_ADMIN } from "../../shared/admin.js";

/** Limpeza pontual, executada somente pelo comando administrativo explícito. */
export async function limparUsuariosExcetoAdmin(db: PrismaClient) {
  return db.$transaction(async tx => {
    // Impede criações e alterações de contas durante a limpeza.
    await tx.$executeRaw`LOCK TABLE "Usuario" IN SHARE ROW EXCLUSIVE MODE`;
    const admin = await tx.usuario.findUnique({ where: { email: EMAIL_ADMIN } });
    if (!admin || admin.papel !== "ADMIN" || !admin.ativo) throw new Error(`Administrador ${EMAIL_ADMIN} ausente ou inativo. Nenhuma conta foi removida.`);
    const removidos = { usuario: { email: { not: EMAIL_ADMIN } } };
    await tx.lead.updateMany({ where: { dono: removidos.usuario }, data: { donoId: null } });
    await tx.reuniao.updateMany({ where: { vendedor: removidos.usuario }, data: { vendedorId: null } });
    await tx.mensagem.updateMany({ where: { aprovadaPor: removidos.usuario }, data: { aprovadaPorId: null } });
    // Recuperações, códigos, histórico de senhas e confirmações são apagados por cascade.
    const resultado = await tx.usuario.deleteMany({ where: { email: { not: EMAIL_ADMIN } } });
    await tx.tentativaLogin.deleteMany();
    return resultado.count;
  });
}
