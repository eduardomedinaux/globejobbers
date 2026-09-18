"use client";

import { LinkedinReviewTool } from "@/components/tools/linkedin-review-tool";

/**
 * LinkedIn Review — ferramenta de página única (18/set): a aba Headline foi
 * aposentada. Avaliar a headline colada era redundante (o Review completo lê
 * a headline direto do PDF, no contexto do perfil inteiro) e a definição do
 * alvo (vagas de interesse → Perfil de Mercado) mudou pra sua casa
 * definitiva: Market Intelligence › Meu Alvo. A headline pronta sai na
 * categoria Headline do resultado — uma resposta, zero escolha.
 */
export default function LinkedinReviewPage() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          LinkedIn Review
        </h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">
          Receba uma análise completa do seu perfil em 8 categorias, pra entender exatamente o
          que ajustar pro mercado internacional.
        </p>
      </div>

      <LinkedinReviewTool />
    </div>
  );
}
