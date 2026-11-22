type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Nome do campo para a mensagem: texto do rótulo antes do controle, ou aria-label/placeholder. */
function rotuloDoCampo(campo: Campo) {
  const rotulo = campo.labels?.[0];
  if (rotulo) {
    let texto = "";
    for (const no of Array.from(rotulo.childNodes)) {
      if (no === campo || (no instanceof Element && no.contains(campo))) break;
      texto += no.textContent ?? "";
    }
    texto = texto.replace(/\s+/g, " ").trim();
    if (texto) return texto;
  }
  return campo.getAttribute("aria-label") || (campo instanceof HTMLSelectElement ? "" : campo.placeholder) || "este campo";
}

/** Mensagem em português para um campo que não passou na validação do formulário. */
export function mensagemDeValidacao(campo: Campo) {
  const v = campo.validity;
  const nome = `“${rotuloDoCampo(campo)}”`;
  if (v.customError) return campo.validationMessage;
  if (v.valueMissing) {
    if (campo instanceof HTMLSelectElement) return `Selecione uma opção em ${nome}.`;
    if (campo instanceof HTMLInputElement && campo.type === "checkbox") return `Marque ${nome} para continuar.`;
    return `Preencha o campo ${nome}.`;
  }
  if (campo instanceof HTMLSelectElement) return `Confira o campo ${nome}.`;
  if (v.tooShort) return `${nome} precisa ter pelo menos ${campo.minLength} caracteres. Agora tem ${campo.value.length}.`;
  if (v.tooLong) return `${nome} pode ter no máximo ${campo.maxLength} caracteres.`;
  if (v.typeMismatch) return campo.type === "email" ? `Informe um e-mail válido em ${nome}.` : `Valor inválido em ${nome}.`;
  if (v.patternMismatch) return campo.title || `Confira o formato de ${nome}.`;
  if (campo instanceof HTMLInputElement) {
    if (v.rangeUnderflow) return `${nome} deve ser no mínimo ${campo.min}.`;
    if (v.rangeOverflow) return `${nome} deve ser no máximo ${campo.max}.`;
  }
  if (v.stepMismatch || v.badInput) return `Valor inválido em ${nome}.`;
  return `Confira o campo ${nome}.`;
}
