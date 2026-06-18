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
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col gap-3 rounded-lg border border-border bg-card/95 p-4 shadow-md backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="size-4 text-primary" />
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
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Revelando…" : "Revelar headline"}
        </Button>
      </form>
    </div>
  );
}
