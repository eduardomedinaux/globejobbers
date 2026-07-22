"use client";

import { useEffect, useState } from "react";
import { getScoreStage } from "@/lib/score-stages";

/** Conta de 0 até `target` rapidamente, ao montar o componente. */
function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let frame: number;
    function step(timestamp: number) {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      setValue(Math.round(progress * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

interface ScoreMiniCardProps {
  score: number;
  label?: string;
}

/** Versão compacta do ScoreCard — usada onde não há subscores (Ato 1 e Headline Optimizer logado). */
export function ScoreMiniCard({ score, label = "Score da sua Headline" }: ScoreMiniCardProps) {
  const animatedScore = useCountUp(score);
  const stage = getScoreStage(score);
  return (
    <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
        <div className="flex items-baseline gap-1">
          <span className="text-[60px] font-semibold leading-[0.9] tracking-[-0.04em] tabular-nums text-[#0F4D4A]">
            {animatedScore}
          </span>
          <span className="text-xl font-medium text-[#B4B4AF]">/100</span>
        </div>
        <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[13px] font-semibold text-[#0F4D4A]">
          {stage.label}
        </span>
      </div>
      <p className="mt-2 text-[13.5px] text-[#6E6E72]">{label}</p>
      <p className="mt-1 text-[13.5px] leading-[1.5] text-[#6E6E72]">{stage.description}</p>
    </div>
  );
}
