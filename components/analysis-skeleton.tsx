"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const MESSAGES = [
  "Lendo seu perfil…",
  "Comparando com vagas internacionais…",
  "Avaliando clareza de impacto e keywords…",
  "Reescrevendo sua headline para recrutadores internacionais…",
];

function SkeletonCard({ variant }: { variant: "score" | "headline" }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)] sm:p-[26px_28px]">
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
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-12 sm:px-10 sm:py-16">
      <p className="mb-[18px] text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#0F4D4A] transition-opacity duration-200">
        {MESSAGES[messageIndex]}
      </p>
      <div className="grid grid-cols-1 items-stretch gap-[18px] min-[720px]:grid-cols-2">
        <SkeletonCard variant="score" />
        <SkeletonCard variant="headline" />
      </div>
    </div>
  );
}
