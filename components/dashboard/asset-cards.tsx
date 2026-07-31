"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Briefcase, CheckCircle2, FileUp, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { UserDocumentSummary } from "@/lib/user-documents";

export interface MarketProfileCardData {
  targetRole: string;
  marketLabel: string;
  keywordCount: number;
}

interface AssetCardsProps {
  marketProfile: MarketProfileCardData | null;
  document: UserDocumentSummary | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/**
 * O coração do "dashboard vivo": as DUAS coisas importantes ficam explícitas
 * no topo — colar as vagas (Perfil de Mercado) e subir o perfil do LinkedIn.
 * Sem wizard bloqueante: cada card é uma missão que vira o card do ativo
 * quando cumprida. Os ativos também se preenchem passivamente pelo uso das
 * ferramentas (as rotas salvam o que o usuário sobe).
 */
export function AssetCards({ marketProfile, document: initialDoc }: AssetCardsProps) {
  const [doc, setDoc] = useState<UserDocumentSummary | null>(initialDoc);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const complete = Boolean(marketProfile) && Boolean(doc);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "linkedin_pdf");

    try {
      const res = await fetch("/api/profile-document", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar seu PDF.");
      setDoc(data.document as UserDocumentSummary);
      track("profile_document_uploaded", { source: "dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!complete && (
        <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
          Comece por aqui — estes 2 passos destravam tudo
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Ativo 1: Perfil de Mercado (as vagas) */}
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border p-5",
            marketProfile
              ? "border-[#EAEAE4] bg-white"
              : "border-2 border-dashed border-[#0F4D4A]/40 bg-[#EAF1EF]/40",
          )}
        >
          <div className="flex items-center gap-2.5">
            {marketProfile ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0F4D4A]" />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0F4D4A] text-[12px] font-bold text-white">
                1
              </span>
            )}
            <h3 className="text-[15px] font-semibold text-[#1B1B1E]">
              {marketProfile ? "Seu Perfil de Mercado" : "Cole as vagas que você quer"}
            </h3>
          </div>

          {marketProfile ? (
            <>
              <p className="text-[13.5px] leading-[1.55] text-[#3F3F43]">
                <strong>{marketProfile.targetRole}</strong> · {marketProfile.marketLabel} ·{" "}
                {marketProfile.keywordCount} keywords mapeadas das suas vagas
              </p>
              <Link
                href="/tools/linkedin-review?tab=headline"
                className="flex items-center gap-1.5 text-[13px] font-medium text-[#0F4D4A] hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar com novas vagas
              </Link>
            </>
          ) : (
            <>
              <p className="text-[13.5px] leading-[1.55] text-[#5C5C60]">
                É daqui que tudo nasce: a IA lê as vagas que você deseja e mapeia exatamente o que
                esse mercado busca. Todas as ferramentas usam esse alvo.
              </p>
              <Link
                href="/tools/linkedin-review?tab=headline"
                onClick={() => track("asset_mission_clicked", { asset: "market_profile" })}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-[#0F4D4A] px-4 py-2.5 text-[13.5px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C]"
              >
                <Briefcase className="h-4 w-4" />
                Colar minhas vagas
              </Link>
            </>
          )}
        </div>

        {/* Ativo 2: Perfil Profissional (PDF do LinkedIn) */}
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border p-5",
            doc
              ? "border-[#EAEAE4] bg-white"
              : "border-2 border-dashed border-[#0F4D4A]/40 bg-[#EAF1EF]/40",
          )}
        >
          <div className="flex items-center gap-2.5">
            {doc ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0F4D4A]" />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0F4D4A] text-[12px] font-bold text-white">
                2
              </span>
            )}
            <h3 className="text-[15px] font-semibold text-[#1B1B1E]">
              {doc ? "Seu perfil salvo" : "Suba o PDF do seu LinkedIn"}
            </h3>
          </div>

          {doc ? (
            <p className="text-[13.5px] leading-[1.55] text-[#3F3F43]">
              <strong>{doc.filename}</strong> · salvo em {formatDate(doc.createdAt)} — o Review e o
              CV Tailor já usam sem pedir de novo.
            </p>
          ) : (
            <p className="text-[13.5px] leading-[1.55] text-[#5C5C60]">
              Uma vez só (LinkedIn → Mais → Salvar como PDF). Com ele salvo, Review e CV Tailor
              rodam em 1 clique.
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "inline-flex items-center gap-2 self-start rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-60",
              doc
                ? "border border-[#E2E2DC] bg-white text-[#3F3F43] hover:bg-[#FAFAF8]"
                : "bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]",
            )}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {uploading ? "Salvando…" : doc ? "Substituir PDF" : "Subir meu PDF"}
          </button>
          {error && <p className="text-[12.5px] text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
