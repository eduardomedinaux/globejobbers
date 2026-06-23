// Validação defensiva do texto extraído do PDF no servidor. Pega o caso de
// um PDF cujo "conteúdo" extraído é, na prática, só um link (ex.: PDF
// gerado a partir de uma página com pouco texto real) em vez do perfil.
export const MIN_PROFILE_LENGTH = 50;

const LOOKS_LIKE_URL = /https?:\/\/\S+|linkedin\.com\/in\//i;
// Acima desse tamanho, mesmo que contenha uma URL (ex.: link de contato no
// fim do texto), é claramente o perfil extraído e não só o link.
const URL_SUSPECT_MAX_LENGTH = 300;

export function validateProfileText(rawText: string): string | null {
  const text = rawText.trim();

  if (LOOKS_LIKE_URL.test(text) && text.length < URL_SUSPECT_MAX_LENGTH) {
    return "Não consegui extrair o conteúdo do seu perfil desse PDF. Gere o PDF de novo pelo LinkedIn (Mais → Salvar como PDF) e suba aqui.";
  }

  if (text.length < MIN_PROFILE_LENGTH) {
    return "O perfil parece vazio ou muito curto. Confira se o PDF tem seu nome, headline, sobre e experiências, e suba de novo.";
  }

  return null;
}
