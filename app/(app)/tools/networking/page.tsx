"use client";

import { useEffect, useState } from "react";
import { NetworkingResultView } from "@/components/tools/networking-result";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  NETWORKING_RECIPIENT_OPTIONS,
  type HeadlineLanguage,
  type NetworkingRecipient,
  type NetworkingResult,
} from "@/lib/types";

type Step = "input" | "loading" | "result" | "limit_reached";

/**
 * Mensagens de Networking (apoio direto à mentoria): nota de conexão
 * (≤300 chars), follow-up e InMail, por tipo de destinatário. Usa o Perfil
 * de Mercado ativo por baixo (o servidor injeta — nada a preencher aqui).
 */
export default function NetworkingPage() {
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NetworkingResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [recipient, setRecipient] = useState<NetworkingRecipient>("recruiter");
  const [company, setCompany] = useState("");
  const [jobContext, setJobContext] = useState("");
  const [personalContext, setPersonalContext] = useState("");
  const [language, setLanguage] = useState<HeadlineLanguage>("en");

  useEffect(() => {
    track("networking_viewed");
  }, []);

  async function handleSubmit() {
    setStep("loading");
    setError(null);
    track("networking_started", { recipient });

    try {
      const res = await fetch("/api/tools/networking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, company, jobContext, personalContext, language }),
      });
      const data = await res.json();

      if (res.status === 403 && data.code === "PLAN_REQUIRED") {
        track("plan_required", { tool_type: "networking" });
        window.location.assign("/assinatura");
        return;
      }
      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "networking" });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível gerar suas mensagens.");
      }

      setResult(data.analysis as NetworkingResult);
      setRemaining(data.usage?.remaining ?? null);
      setStep("result");
      track("networking_completed", { recipient });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
      track("networking_failed", { error: err instanceof Error ? err.message : "unknown" });
    }
  }

  function handleReset() {
    setStep("input");
    setResult(null);
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          Mensagens de Networking
        </h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">
          Abordagens que constroem relacionamento — sem pedir emprego de cara,
          sem soar template.
        </p>
      </div>

      {(step === "input" || step === "limit_reached") && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nw-recipient">Quem você quer abordar?</Label>
            <select
              id="nw-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value as NetworkingRecipient)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {NETWORKING_RECIPIENT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nw-company">
              Empresa-alvo <span className="font-normal text-[#8A8A85]">(opcional)</span>
            </Label>
            <Input
              id="nw-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex.: Stripe"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nw-job">
              Vaga ou contexto da oportunidade{" "}
              <span className="font-normal text-[#8A8A85]">(opcional)</span>
            </Label>
            <Textarea
              id="nw-job"
              value={jobContext}
              onChange={(e) => setJobContext(e.target.value)}
              placeholder="Cole a vaga ou descreva a oportunidade que motivou a abordagem…"
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nw-personal">
              Seu gancho real <span className="font-normal text-[#8A8A85]">(opcional, mas faz diferença)</span>
            </Label>
            <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
              Algo verdadeiro que conecta você à pessoa: um post dela que você leu, projeto da
              empresa que você acompanha, interesse em comum…
            </p>
            <Textarea
              id="nw-personal"
              value={personalContext}
              onChange={(e) => setPersonalContext(e.target.value)}
              placeholder="Ex.: vi a palestra dela sobre design systems na Config…"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Idioma</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-lg border px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                  language === "en"
                    ? "border-[#0F4D4A] bg-[#EAF1EF] text-[#0F4D4A]"
                    : "border-[#E2E2DC] text-[#6E6E72]"
                }`}
              >
                Inglês
              </button>
              <button
                type="button"
                onClick={() => setLanguage("pt")}
                className={`rounded-lg border px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                  language === "pt"
                    ? "border-[#0F4D4A] bg-[#EAF1EF] text-[#0F4D4A]"
                    : "border-[#E2E2DC] text-[#6E6E72]"
                }`}
              >
                Português
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleSubmit}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Gerar minhas mensagens
          </Button>
        </>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Escrevendo uma abordagem que soa como você, não como template…
          </p>
        </div>
      )}

      <UpgradeModal
        open={step === "limit_reached"}
        onClose={() => setStep("input")}
        toolType="networking"
      />

      {step === "result" && result && (
        <div className="flex flex-col gap-4">
          <NetworkingResultView result={result} />
          {remaining !== null && (
            <p className="text-center text-[13px] text-[#8A8A85]">
              {remaining} geração{remaining === 1 ? "" : "ões"} restante{remaining === 1 ? "" : "s"} este mês
            </p>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="mx-auto text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
          >
            Gerar para outra pessoa
          </button>
        </div>
      )}
    </div>
  );
}
