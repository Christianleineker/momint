/** O cartão "Proteja o acesso à sua conta" pode ser fechado no X. Ele some de todas as
 *  telas e só volta no próximo login, quando a página de login limpa esta marca. */
const CHAVE = "momint:aviso-seguranca-fechado";

export function avisoSegurancaFechado() {
  try { return localStorage.getItem(CHAVE) === "1"; } catch { return false; }
}

export function fecharAvisoSeguranca() {
  try { localStorage.setItem(CHAVE, "1"); } catch { /* sem armazenamento local: fecha só nesta visita */ }
}

/** Chamado no login bem-sucedido: o cartão volta a aparecer. */
export function reabrirAvisoSeguranca() {
  try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento local: nada a limpar */ }
}
