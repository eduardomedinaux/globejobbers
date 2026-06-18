"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SUBSCORE_META, type Subscores } from "@/lib/types";

interface ScorePanelProps {
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

export function ScorePanel({ score, subscores }: ScorePanelProps) {
  const animatedScore = useCountUp(score);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Internacional</CardTitle>
        <CardDescription>
          O quão pronto seu perfil está para recrutadores internacionais que pagam em dólar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <div className="flex items-baseline justify-center gap-1 sm:justify-start">
          <span className="text-6xl font-semibold tabular-nums text-primary sm:text-7xl">
            {animatedScore}
          </span>
          <span className="text-xl font-medium text-muted-foreground">/100</span>
        </div>

        <div className="flex flex-col gap-4">
          {SUBSCORE_META.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{label}</span>
                <span className="tabular-nums text-muted-foreground">{subscores[key]}</span>
              </div>
              <Progress value={subscores[key]} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
