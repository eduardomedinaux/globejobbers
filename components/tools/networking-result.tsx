"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { NetworkingResult } from "@/lib/types";

function MessageCard({
  title,
  hint,
  text,
  charLimit,
}: {
  title: string;
  hint?: string;
  text: string;
  charLimit?: number;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bloqueado — sem fallback barulhento.
    }
  }

  return (
    <div className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-[#1B1B1E]">{title}</p>
          {hint && <p className="text-[12.5px] text-[#8A8A85]">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E2E2DC] px-2.5 py-1.5 text-[12.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#0F4D4A]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiada" : "Copiar"}
        </button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.6] text-[#1B1B1E]">{text}</p>
      {charLimit && (
        <p className="mt-2 text-[12px] text-[#A0A09B]">
          {text.length}/{charLimit} caracteres
        </p>
      )}
    </div>
  );
}

/** Resultado das Mensagens de Networking — usado na ferramenta e no histórico. */
export function NetworkingResultView({ result }: { result: NetworkingResult }) {
  return (
    <div className="flex flex-col gap-4">
      <MessageCard
        title="Nota de conexão"
        hint="Vai junto do pedido de conexão — limite de 300 caracteres do LinkedIn."
        text={result.connectionNote}
        charLimit={300}
      />
      <MessageCard
        title="Follow-up após o aceite"
        hint="Mande 1-2 dias depois que a pessoa aceitar."
        text={result.followUpMessage}
      />
      <MessageCard
        title="Versão InMail / e-mail"
        hint="Pra quando não dá pra conectar — um pouco mais direta."
        text={result.inmailVersion}
      />
      {result.rationale && (
        <p className="text-[13.5px] leading-[1.6] text-[#6E6E72]">{result.rationale}</p>
      )}
    </div>
  );
}
