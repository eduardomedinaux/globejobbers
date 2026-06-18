"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const MESSAGES = [
  "Lendo seu perfil…",
  "Comparando com vagas internacionais…",
  "Avaliando clareza de impacto e keywords…",
  "Reescrevendo sua headline para recrutadores internacionais…",
];

export function AnalysisSkeleton() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
        <p className="text-sm font-medium text-primary transition-opacity duration-200">
          {MESSAGES[messageIndex]}
        </p>
        <div className="flex w-full flex-col items-center gap-3">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex w-full flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
