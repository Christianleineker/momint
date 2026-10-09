export interface Email {
  enviar(mensagem: { destinatario: string; assunto: string; texto: string }): Promise<void>;
}
