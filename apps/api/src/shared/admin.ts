export const EMAIL_ADMIN = "jadiframe@gmail.com";
export const emailNormalizado = (email: string) => email.trim().toLowerCase();
export const adminPermitido = (usuario: { email: string; papel: string }) =>
  usuario.papel !== "ADMIN" || emailNormalizado(usuario.email) === EMAIL_ADMIN;
