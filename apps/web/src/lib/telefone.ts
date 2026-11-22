/** Máscara de telefone brasileiro: (41) 3333-0000 (fixo) ou (41) 99999-0000 (celular). */
export function mascararTelefone(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const numero = d.slice(2);
  if (numero.length <= 4) return `(${ddd}) ${numero}`;
  const corte = numero.length === 9 ? 5 : 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

/** Próximo valor do campo. Apagar um caractere da máscara (parêntese, espaço ou hífen)
 *  apaga o dígito anterior, para o Backspace não "travar" na formatação. */
export function proximoTelefone(anterior: string, digitado: string) {
  let digitos = digitado.replace(/\D/g, "");
  if (digitado.length < anterior.length && digitos === anterior.replace(/\D/g, "")) digitos = digitos.slice(0, -1);
  return mascararTelefone(digitos);
}
