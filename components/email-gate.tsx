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
        className="flex w-full max-w-[260px] flex-col gap-2.5 rounded-xl border border-[#E2EAE8] bg-white/95 p-3.5 shadow-[0_1px_2px_rgba(20,20,20,0.03),0_12px_32px_rgba(20,20,20,0.06)] backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#1B1B1E]">
          <Lock className="size-3.5 text-[#0F4D4A]" />
          Veja sua headline reescrita
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-gate" className="sr-only">
            E-mail
          </Label>
          <Input
            id="email-gate"
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="h-9 border-[#E2EAE8] bg-white text-sm"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
        >
          {isSubmitting ? "Revelando…" : "Revelar headline"}
        </Button>
      </form>
    </div>
  );
}
