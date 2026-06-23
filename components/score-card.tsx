"use client";

import { useEffect, useState } from "react";
import { SUBSCORE_META, type Subscores } from "@/lib/types";
import { getScoreStage, getWeakestSubscore } from "@/lib/score-stages";

interface ScoreCardProps {
  score: number;
  subscores: Subscores;
}

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

export function ScoreCard({ score, subscores }: ScoreCardProps) {
  const animatedScore = useCountUp(score);
  const stage = getScoreStage(score);
  const weakest = getWeakestSubscore(subscores);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)] sm:p-[26px_28px]">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
        <div className="flex items-baseline gap-1">
          <span className="text-[64px] font-semibold leading-[0.9] tracking-[-0.04em] tabular-nums text-[#0F4D4A]">
            {animatedScore}
          </span>
          <span className="text-xl font-medium text-[#B4B4AF]">/100</span>
        </div>
        <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[13px] font-semibold text-[#0F4D4A]">
          {stage.label}
        </span>
      </div>
      <p className="mt-2 text-[13.5px] text-[#6E6E72]">Score Internacional</p>
      <p className="mb-[22px] mt-1 text-[13.5px] leading-[1.5] text-[#6E6E72]">
        {stage.description}
      </p>

      <div className="flex flex-col gap-[15px]">
        {SUBSCORE_META.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#3F3F43]">{label}</span>
              <span className="font-semibold tabular-nums text-[#161618]">{subscores[key]}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFEFE9]">
              <div
                className="h-full rounded-full bg-[#0F4D4A] transition-all"
                style={{ width: `${subscores[key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {weakest && (
        <div className="mt-5 rounded-xl border border-[#ECECE6] bg-[#FBFBF9] p-3.5">
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Seu ponto mais fraco
          </p>
          <p className="mt-1 text-[13.5px] font-medium text-[#3F3F43]">{weakest.label}</p>
        </div>
      )}
    </div>
  );
}
