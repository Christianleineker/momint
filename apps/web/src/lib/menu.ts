/** Preferência de menu lateral recolhido. Cookie comum (sem dado sensível, sem
 *  HttpOnly) para que o servidor já renderize a largura certa e a tela não
 *  "pule" ao carregar. Compartilhado entre o layout (servidor) e a Sidebar.
 *  Sem max-age: vale só até fechar o navegador, então o sistema sempre abre
 *  com o menu recolhido. */
export const COOKIE_MENU = "momint_menu_sessao";
