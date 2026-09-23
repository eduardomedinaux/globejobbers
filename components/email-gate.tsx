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
}

/**
 * Gate de e-mail — o ponto focal do resultado (23/set): borda/anel teal,
 * sombra mais forte e autoFocus no campo. A conversão da página acontece
 * aqui; tudo em volta é coadjuvante.
 */
export function EmailGate({ onSubmit, isSubmitting, error }: EmailGateProps) {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit(email.trim());
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-3">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[280px] flex-col gap-2.5 rounded-xl border-2 border-[#0F4D4A]/35 bg-white p-4 shadow-[0_2px_4px_rgba(20,20,20,0.04),0_18px_44px_rgba(15,77,74,0.18)] ring-4 ring-[#0F4D4A]/10"
      >
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#1B1B1E]">
          <Lock className="size-3.5 text-[#0F4D4A]" />
          Veja sua headline reescrita
        </div>
        <p className="-mt-1 text-[12px] leading-[1.45] text-[#6E6E72]">
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
            autoFocus
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="h-10 border-[#0F4D4A]/25 bg-white text-[14px] focus-visible:ring-[#0F4D4A]/30"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 bg-[#0F4D4A] text-[14px] font-semibold text-[#FBFEFD] hover:bg-[#0B3F3C]"
        >
          {isSubmitting ? "Revelando…" : "Revelar minha headline"}
        </Button>
      </form>
    </div>
  );
}
