"use client";

import { useEffect, useRef, useState } from "react";
import { MarketIntelReportView } from "@/components/tools/market-intel-report";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  MARKET_INTEL_REGION_OPTIONS,
  type MarketIntelRegion,
  type MarketIntelReport,
} from "@/lib/types";

type Step = "input" | "running" | "result" | "limit_reached";

/**
 * Market Intelligence — passo 1 da jornada. O usuário informa cargo +
 * região; o client orquestra as 3 etapas do servidor (start → extract em
 * lotes → finalize) mostrando progresso real. Relatório cacheado chega
 * pronto do start (segundo usuário do mesmo mercado não espera).
 */
export default function MarketIntelPage() {
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MarketIntelReport | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [role, setRole] = useState("");
  const [region, setRegion] = useState<MarketIntelRegion>("us");
  const [progress, setProgress] = useState<{ label: string; pct: number }>({
    label: "",
    pct: 0,
  });
  // Evita corrida se o usuário sair da página no meio da orquestração.
  const cancelled = useRef(false);

  useEffect(() => {
    track("market_intel_viewed");
    return () => {
      cancelled.current = true;
    };
  }, []);

  async function handleSubmit() {
    setStep("running");
    setError(null);
    cancelled.current = false;
    setProgress({ label: "Coletando vagas reais do mercado…", pct: 8 });
    track("market_intel_started", { region });

    try {
      const startRes = await fetch("/api/tools/market-intel/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, region }),
      });
      const startData = await startRes.json();

      if (startRes.status === 403 && startData.code === "PLAN_REQUIRED") {
        track("plan_required", { tool_type: "market_intel" });
        window.location.assign("/assinatura");
        return;
      }
      if (startRes.status === 403 && startData.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "market_intel" });
        return;
      }
      if (!startRes.ok) {
        throw new Error(startData.error ?? "Não foi possível coletar as vagas.");
      }

      // Cache: relatório pronto na primeira resposta.
      if (startData.cached && startData.report) {
        setReport(startData.report as MarketIntelReport);
        setStep("result");
        track("market_intel_completed", { region, cached: true });
        return;
      }

      const { reportId, totalJobs, batchSize } = startData as {
        reportId: string;
        totalJobs: number;
        batchSize: number;
      };
      const totalBatches = Math.ceil(totalJobs / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        if (cancelled.current) return;
        setProgress({
          label: `Analisando vagas ${Math.min((batch + 1) * batchSize, totalJobs)} de ${totalJobs}…`,
          pct: 10 + Math.round((80 * (batch + 1)) / totalBatches),
        });
        let extractRes = await fetch("/api/tools/market-intel/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, batchIndex: batch }),
        });
        // 1 retry por lote (falha transitória de IA não derruba o relatório).
        if (!extractRes.ok) {
          extractRes = await fetch("/api/tools/market-intel/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reportId, batchIndex: batch }),
          });
        }
        if (!extractRes.ok) {
          const data = await extractRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Falha ao analisar as vagas.");
        }
      }

      if (cancelled.current) return;
      setProgress({ label: "Calculando os números e escrevendo os insights…", pct: 95 });
      const finalRes = await fetch("/api/tools/market-intel/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const finalData = await finalRes.json();
      if (!finalRes.ok) {
        throw new Error(finalData.error ?? "Não foi possível concluir o relatório.");
      }

      setReport(finalData.report as MarketIntelReport);
      setRemaining(finalData.usage?.remaining ?? null);
      setStep("result");
      track("market_intel_completed", { region, cached: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
      track("market_intel_failed", { error: err instanceof Error ? err.message : "unknown" });
    }
  }

  function handleReset() {
    setStep("input");
    setReport(null);
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          Market Intelligence
        </h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">
          Centenas de vagas reais analisadas pra você entender, em 30 segundos,
          como esse mercado funciona — antes de otimizar qualquer coisa.
        </p>
      </div>

      {(step === "input" || step === "limit_reached") && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mi-role">Cargo que você quer pesquisar</Label>
            <Input
              id="mi-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex.: Product Designer"
            />
            <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
              Prefira o nome em inglês — é como as vagas internacionais são anunciadas.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Onde você quer trabalhar</Label>
            <div className="flex flex-wrap gap-2">
              {MARKET_INTEL_REGION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRegion(option.value)}
                  className={`rounded-lg border px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                    region === option.value
                      ? "border-[#0F4D4A] bg-[#EAF1EF] text-[#0F4D4A]"
                      : "border-[#E2E2DC] text-[#6E6E72]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={role.trim().length < 2}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Analisar esse mercado
          </Button>
        </>
      )}

      {step === "running" && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-[14px] font-medium text-[#0F4D4A]">{progress.label}</p>
          <div className="h-1.5 w-full max-w-[360px] rounded-full bg-[#F0F0EA]">
            <div
              className="h-1.5 rounded-full bg-[#0F4D4A] transition-all duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="text-[12.5px] text-[#A0A09B]">
            Estamos lendo cada vaga de verdade — leva 1 ou 2 minutos.
          </p>
        </div>
      )}

      <UpgradeModal
        open={step === "limit_reached"}
        onClose={() => setStep("input")}
        toolType="market_intel"
      />

      {step === "result" && report && (
        <div className="flex flex-col gap-4">
          <MarketIntelReportView report={report} />
          {remaining !== null && (
            <p className="text-center text-[13px] text-[#8A8A85]">
              {remaining} relatório{remaining === 1 ? "" : "s"} restante{remaining === 1 ? "" : "s"} este mês
            </p>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="mx-auto text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
          >
            Pesquisar outro mercado
          </button>
        </div>
      )}
    </div>
  );
}
