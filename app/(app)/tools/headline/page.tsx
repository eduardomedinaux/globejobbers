import { redirect } from "next/navigation";

/**
 * A aba Headline foi aposentada (18/set): a headline pronta sai na categoria
 * Headline do LinkedIn Review, e o alvo (vagas de interesse) mora no Market
 * Intelligence › Meu Alvo. Redirect mantido pra links antigos/bookmarks.
 */
export default function HeadlineToolRedirect() {
  redirect("/tools/linkedin-review");
}
