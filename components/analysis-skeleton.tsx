"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Loader do score (23/set): barra de progresso + etapas que ganham check
// conforme o tempo passa. O progresso é assintótico (desacelera e nunca
// chega em 100% sozinho) — quando a análise real termina, a página troca
// de tela; a barra nunca mente "pronto" antes da hora.

const STEPS = [
  { at: 0, label: "Lendo seu PDF" },
  { at: 3500, label: "Comparando com o que recrutadores internacionais buscam" },
  { at: 8500, label: "Avaliando impacto, inglês e palavras-chave" },
  { at: 14000, label: "Reescrevendo sua headline" },
];

function SkeletonCard({ variant }: { variant: "score" | "headline" }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#EAEAE4] bg-white p-6 opacity-70 shadow-[0_1px_2px_rgba(20,20,20,0.03)] sm:p-[26px_28px]">
      {variant === "score" ? (
        <>
          <Skeleton className="h-[58px] w-28 rounded-lg" />
          <Skeleton className="mt-2 h-3 w-32" />
          <div className="mt-[22px] flex flex-col gap-[15px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-5 h-3 w-12" />
          <Skeleton className="mt-1.5 h-12 w-full rounded-[10px]" />
          <Skeleton className="mt-4 h-3 w-12" />
          <Skeleton className="mt-1.5 h-16 w-full rounded-[10px]" />
          <Skeleton className="mt-[18px] h-3 w-full" />
        </>
      )}
    </div>
  );
}

export function AnalysisSkeleton() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 200);
    return () => clearInterval(timer);
  }, []);

  // 0 → ~92% com desaceleração natural (constante de tempo ~9s).
  const pct = Math.min(92, Math.round(100 * (1 - Math.exp(-elapsed / 9000))));
  const currentIndex = STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-10 sm:px-10 sm:py-12">
      {/* O palco do loader: card central com progresso + etapas */}
      <div className="mx-auto mb-8 w-full max-w-[520px] rounded-2xl border border-[#E2EAE8] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03),0_16px_40px_rgba(15,77,74,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[#0F4D4A]">Analisando seu perfil</p>
          <span className="text-[13px] font-semibold tabular-nums text-[#0F4D4A]">{pct}%</span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#EFEFE9]">
          <div
            className="h-full rounded-full bg-[#0F4D4A] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          {STEPS.map((step, i) => {
            const done = i < currentIndex;
            const current = i === currentIndex;
            return (
              <li key={step.label} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    done && "bg-[#0F4D4A]",
                    current && "text-[#0F4D4A]",
                    !done && !current && "border border-[#E2E2DC]",
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3 text-white" aria-hidden />
                  ) : current ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[13.5px] leading-[1.4]",
                    done && "text-[#8A8A85]",
                    current && "font-medium text-[#1B1B1E]",
                    !done && !current && "text-[#B6B6B1]",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-[18px] min-[720px]:grid-cols-2">
        <SkeletonCard variant="score" />
        <SkeletonCard variant="headline" />
      </div>
    </div>
  );
}
