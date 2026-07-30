"use client";

import { useEffect, useState } from "react";
import { PostResultView } from "@/components/tools/post-result";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { HeadlineLanguage, PostResult } from "@/lib/types";

type Step = "input" | "loading" | "result" | "limit_reached";

// Espelha MIN_TOPIC_LENGTH do servidor.
const MIN_TOPIC_LENGTH = 80;

/**
 * Criador de Posts (apoio direto à mentoria): 2 variações (narrativa +
 * insight) posicionadas nas keywords do mercado-alvo. A matéria-prima é a
 * história REAL do usuário — nunca inventamos vivência.
 */
export default function PostsPage() {
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PostResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<HeadlineLanguage>("en");

  useEffect(() => {
    track("post_viewed");
  }, []);

  async function handleSubmit() {
    setStep("loading");
    setError(null);
    track("post_started", {});

    try {
      const res = await fetch("/api/tools/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language }),
      });
      const data = await res.json();

      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "post" });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível gerar seu post.");
      }

      setResult(data.analysis as PostResult);
      setRemaining(data.usage?.remaining ?? null);
      setStep("result");
      track("post_completed", {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
      track("post_failed", { error: err instanceof Error ? err.message : "unknown" });
    }
  }

  function handleReset() {
    setStep("input");
    setResult(null);
    setError(null);
    setTopic("");
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          Criador de Posts
        </h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">
          Transforme suas experiências reais em posts que constroem autoridade
          no mercado que você quer conquistar.
        </p>
      </div>

      {(step === "input" || step === "limit_reached") && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-topic">Conte a história ou o aprendizado</Label>
            <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
              Quanto mais detalhe real (o que aconteceu, o que você fez, o que aprendeu), melhor o
              post. Nada será inventado além do que você contar.
            </p>
            <Textarea
              id="post-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex.: semana passada um redesign que liderei quase foi cancelado porque… no fim, aprendemos que…"
              rows={7}
            />
            {topic.trim().length > 0 && topic.trim().length < MIN_TOPIC_LENGTH && (
              <p className="text-[12.5px] text-[#A0A09B]">
                Conte um pouco mais — detalhes são a matéria-prima do post.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Idioma do post</Label>
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
            disabled={topic.trim().length < MIN_TOPIC_LENGTH}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Gerar meu post
          </Button>
        </>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Transformando sua história em posicionamento…
          </p>
        </div>
      )}

      <UpgradeModal
        open={step === "limit_reached"}
        onClose={() => setStep("input")}
        toolType="post"
      />

      {step === "result" && result && (
        <div className="flex flex-col gap-4">
          <PostResultView result={result} />
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
            Criar outro post
          </button>
        </div>
      )}
    </div>
  );
}
