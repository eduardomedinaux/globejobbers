"use client";

import { PlaceholderTextBox } from "@/components/data-placeholder-text";
import {
  INTERVIEW_QUESTION_CATEGORY_LABELS,
  type InterviewAnswerFeedback,
  type InterviewPrepResult,
} from "@/lib/types";

// Resultado de uma sessão de Interview Prep — usado no resumo do fim do
// treino e na página de detalhe do histórico. A resposta melhorada usa o
// componente compartilhado de placeholders (regra dos números da casa).

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[72px] shrink-0 text-[11.5px] font-medium text-[#8A8A85]">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EFEFE9]">
        <div className="h-full rounded-full bg-[#0F4D4A]" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[12px] font-semibold text-[#0F4D4A]">
        {value}
      </span>
    </div>
  );
}

export function InterviewAnswerFeedbackView({
  item,
  index,
}: {
  item: InterviewAnswerFeedback;
  index: number;
}) {
  return (
    <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
      <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
        Pergunta {index + 1}
      </p>
      <p className="mt-1 text-[15px] font-semibold leading-[1.45] text-[#1B1B1E]">
        {item.question}
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        <ScoreBar label="Clareza" value={item.clarity} />
        <ScoreBar label="Evidência" value={item.evidence} />
        <ScoreBar label="Inglês" value={item.english} />
      </div>

      <p className="mt-3 text-[14px] leading-[1.6] text-[#3F3F43]">{item.feedback}</p>

      {item.englishFixes.length > 0 && (
        <div className="mt-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#8A8A85]">
            Correções de inglês
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {item.englishFixes.map((fix) => (
              <li key={fix} className="text-[13.5px] leading-[1.55] text-[#6E6E72]">
                • {fix}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.redFlags.length > 0 && (
        <div className="mt-3 rounded-[10px] border border-[#F0DCD4] bg-[#FBF6F3] px-4 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#A0522D]">
            Um entrevistador estranharia
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {item.redFlags.map((flag) => (
              <li key={flag} className="text-[13.5px] leading-[1.55] text-[#7A4A35]">
                • {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PlaceholderTextBox
        text={item.improvedAnswer}
        title="Como o candidato ideal responderia"
        hintWithFields="Complete com seus números reais (a gente nunca inventa por você) — e treine falar essa versão em voz alta."
        hintNoFields="Treine falar essa versão em voz alta — copie pra guardar no seu banco de respostas."
        copyLabel={`Copiar resposta melhorada da pergunta ${index + 1}`}
      />

      <details className="mt-3">
        <summary className="cursor-pointer text-[13px] font-medium text-[#8A8A85] hover:text-[#0F4D4A]">
          Ver a resposta que você escreveu
        </summary>
        <p className="mt-2 whitespace-pre-line text-[13.5px] leading-[1.6] text-[#6E6E72]">
          {item.answer}
        </p>
      </details>
    </div>
  );
}

export function InterviewPrepResultView({ result }: { result: InterviewPrepResult }) {
  const unanswered = result.questions.filter(
    (q) => !result.answers.some((a) => a.question === q.question),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#D8E5E2] bg-[#F4F8F7] px-5 py-4">
        <p className="text-[14.5px] font-semibold text-[#0F4D4A]">
          Treino de entrevista — {result.targetRole}
        </p>
        <p className="mt-0.5 text-[13px] text-[#3F3F43]">
          {result.targetMarketLabel} · {result.answers.length} resposta
          {result.answers.length === 1 ? "" : "s"} treinada
          {result.answers.length === 1 ? "" : "s"}
        </p>
      </div>

      {result.answers.map((item, i) => (
        <InterviewAnswerFeedbackView key={item.question} item={item} index={i} />
      ))}

      {unanswered.length > 0 && (
        <div className="rounded-2xl border border-dashed border-[#D8D8D2] bg-[#FAFAF8] p-5">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Perguntas que ficaram pra próxima
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {unanswered.map((q) => (
              <li key={q.question} className="text-[13.5px] leading-[1.5] text-[#6E6E72]">
                <span className="mr-1.5 rounded-full bg-[#EFEFE9] px-2 py-0.5 text-[11px] font-semibold text-[#8A8A85]">
                  {INTERVIEW_QUESTION_CATEGORY_LABELS[q.category]}
                </span>
                {q.question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
