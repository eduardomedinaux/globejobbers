import { ScoreMiniCard } from "@/components/score-mini-card";
import { LINKEDIN_REVIEW_CATEGORY_META, type LinkedinReviewResult } from "@/lib/types";

export function LinkedinReviewResultView({ result }: { result: LinkedinReviewResult }) {
  const byKey = Object.fromEntries(result.categories.map((c) => [c.key, c]));

  return (
    <div className="flex flex-col gap-5">
      <ScoreMiniCard score={result.overallScore} label="Score Internacional do seu perfil" />

      <div className="flex flex-col gap-4">
        {LINKEDIN_REVIEW_CATEGORY_META.map(({ key, label }) => {
          const category = byKey[key];
          if (!category) return null;
          return (
            <div
              key={key}
              className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold text-[#1B1B1E]">{label}</p>
                <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[13px] font-semibold text-[#0F4D4A]">
                  {category.score}/100
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EFEFE9]">
                <div
                  className="h-full rounded-full bg-[#0F4D4A]"
                  style={{ width: `${category.score}%` }}
                />
              </div>
              <p className="mt-3 text-[14px] leading-[1.55] text-[#3F3F43]">{category.diagnosis}</p>
              <p className="mt-2 text-[13.5px] leading-[1.5] text-[#6E6E72]">
                <span className="font-semibold text-[#8A8A85]">Recomendação: </span>
                {category.recommendation}
              </p>
              {category.example && (
                <div className="mt-3 rounded-[10px] border border-[#E2EAE8] bg-[#F6F8F7] px-4 py-3">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
                    Exemplo melhorado
                  </p>
                  <p className="mt-1 text-[13.5px] leading-[1.5] text-[#1B1B1E]">{category.example}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
