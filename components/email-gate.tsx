"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailGateProps {
  onSubmit: (email: string) => void;
  isSubmitting: boolean;
  error: string | null;
  /** false no mobile: teclado abrindo sozinho esconderia o score. */
  autoFocusInput?: boolean;
}

/**
 * Gate de e-mail (redesenho 24/set): sem overlay, sem blur por trás, sem
 * sombra — ele É o conteúdo da caixa "Depois" até o reveal. O texto de
 * apoio usa o mesmo estilo da headline reescrita (continuidade visual:
 * este espaço vira a headline).
 */
export function EmailGate({ onSubmit, isSubmitting, error, autoFocusInput = true }: EmailGateProps) {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit(email.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 py-1">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1B1B1E]">
        <Lock className="size-4 text-[#0F4D4A]" />
        Veja sua headline reescrita
      </div>
      <p className="text-base font-medium leading-[1.5] text-[#1B1B1E]">
        Deixe seu e-mail e a headline abre na hora — pronta pra colar no LinkedIn.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email-gate" className="sr-only">
          E-mail
        </Label>
        <Input
          id="email-gate"
          type="email"
          required
          autoFocus={autoFocusInput}
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="h-11 border-[#0F4D4A]/25 bg-white text-[15px] focus-visible:ring-[#0F4D4A]/30"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 bg-[#0F4D4A] text-[15px] font-semibold text-[#FBFEFD] hover:bg-[#0B3F3C]"
      >
        {isSubmitting ? "Revelando…" : "Revelar minha headline"}
      </Button>
    </form>
  );
}
