"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfUploadCardProps {
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
  error: string | null;
}

const STEPS: { text: React.ReactNode }[] = [
  {
    text: (
      <>
        Abra o seu perfil no LinkedIn (toque na sua foto e em{" "}
        <strong className="text-[#26262A]">Ver perfil</strong>).
      </>
    ),
  },
  {
    text: (
      <>
        Clique no botão <strong className="text-[#26262A]">Mais</strong>, logo
        abaixo do seu nome.
      </>
    ),
  },
  {
    text: (
      <>
        Selecione <strong className="text-[#26262A]">Salvar como PDF</strong> e
        suba o arquivo aqui.
      </>
    ),
  },
];

export function PdfUploadCard({ onSubmit, isLoading, error }: PdfUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    const looksLikePdf =
      candidate.type === "application/pdf" || candidate.name.toLowerCase().endsWith(".pdf");
    if (!looksLikePdf) {
      setLocalError("Esse arquivo não é um PDF. Envie o PDF do seu perfil do LinkedIn.");
      return;
    }
    setFile(candidate);
    setLocalError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    acceptFile(e.target.files?.[0]);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (isLoading) return;
    acceptFile(e.dataTransfer.files?.[0]);
  }

  function handleRemoveFile() {
    setFile(null);
    setLocalError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    if (!file) {
      setLocalError("Selecione um PDF para continuar.");
      return;
    }
    setLocalError(null);

    const formData = new FormData();
    formData.append("file", file);
    onSubmit(formData);
  }

  const visibleError = localError ?? error;

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 sm:px-10">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#EAEAE4] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,20,0.03),0_12px_32px_rgba(20,20,20,0.04)] sm:p-[30px]"
      >
        <label htmlFor="profile-pdf" className="mb-3.5 block text-sm font-medium text-[#2A2A2D]">
          Suba o PDF do seu perfil do LinkedIn
        </label>

        <input
          ref={fileInputRef}
          id="profile-pdf"
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="sr-only"
          disabled={isLoading}
        />

        <label
          htmlFor="profile-pdf"
          onDragOver={(e) => {
            e.preventDefault();
            if (!isLoading) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex h-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D6D6CE] bg-[#FCFCFB] px-5 text-center transition-colors",
            !isLoading && "cursor-pointer hover:border-[#0F4D4A] hover:bg-[#F7FAF9]",
            isDragOver && "border-[#0F4D4A] bg-[#F7FAF9]",
            isLoading && "cursor-not-allowed opacity-60",
          )}
        >
          <span className="flex items-center gap-1.5 text-[14.5px] font-semibold text-[#0F4D4A]">
            <span className="size-[7px] rounded-full bg-[#0F4D4A]" />
            Escolher arquivo PDF
          </span>
          <span className="text-[12.5px] text-[#9A9A95]">
            ou arraste o arquivo aqui · apenas .pdf
          </span>
        </label>

        {file && (
          <div className="mt-[11px] flex items-center justify-between rounded-[10px] border border-[#E2EAE8] bg-[#F6F8F7] px-[13px] py-2.5">
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#0F4D4A]">
              <span className="size-[7px] shrink-0 rounded-full bg-[#0F4D4A]" />
              <span className="truncate">{file.name}</span>
            </span>
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={isLoading}
              className="shrink-0 text-[#0F4D4A] transition-opacity hover:opacity-70 disabled:opacity-40"
              aria-label="Remover arquivo"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="mt-[18px] rounded-xl border border-[#ECECE6] bg-[#FBFBF9] p-4 pb-[17px]">
          <p className="mb-[13px] text-xs font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Como baixar seu PDF do LinkedIn
          </p>
          <ol className="flex flex-col gap-[11px]">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-[11px]">
                <span className="flex size-[21px] shrink-0 items-center justify-center rounded-full bg-[#EAF1EF] text-xs font-semibold tabular-nums text-[#0F4D4A]">
                  {i + 1}
                </span>
                <span className="text-[13.5px] leading-[1.5] text-[#3F3F43]">{step.text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-[14px] flex items-start gap-[9px] rounded-[10px] border border-[#E7EEEC] bg-[#F6F8F7] px-[13px] py-[11px]">
          <span className="mt-1 size-[7px] shrink-0 rounded-full bg-[#0F4D4A]" />
          <p className="text-[13px] leading-[1.5] text-[#566461]">
            Não pedimos seu login nem o link — só o PDF do perfil, para manter sua conta segura.
          </p>
        </div>

        {visibleError && (
          <div className="mt-[14px] flex items-start gap-[9px] rounded-[10px] border border-destructive/20 bg-destructive/5 px-[13px] py-[11px]">
            <span className="mt-1 size-[7px] shrink-0 rounded-full bg-destructive" />
            <p className="text-[13px] leading-[1.5] text-destructive">{visibleError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-5 h-[52px] w-full rounded-xl bg-[#0F4D4A] text-base font-semibold tracking-[-0.01em] text-[#FBFEFD] shadow-[0_1px_2px_rgba(15,77,74,0.25)] transition-colors hover:bg-[#0B3F3C] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Calculando…" : "Calcular meu Score"}
        </button>
      </form>

      <p className="mt-3.5 text-center text-[12.5px] text-[#A6A6A1]">
        Análise instantânea · sem cadastro · 100% grátis
      </p>
    </div>
  );
}
