"use client";

import { useRef, useState } from "react";
import { FileText, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { SAMPLE_PROFILE_TEXT } from "@/lib/sample-profile";

interface ProfileInputProps {
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
  error: string | null;
}

export function ProfileInput({ onSubmit, isLoading, error }: ProfileInputProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContent = text.trim().length > 0 || file !== null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setText("");
  }

  function handleUseSample() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setText(SAMPLE_PROFILE_TEXT);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    } else {
      formData.append("profileText", text);
    }
    onSubmit(formData);
  }

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {file ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-foreground">
                <FileText className="size-4 text-primary" />
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Remover arquivo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o texto do seu perfil de LinkedIn (nome, headline, seção sobre, experiências...)"
              className="min-h-48 resize-y text-sm"
              disabled={isLoading}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="profile-pdf"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="size-4" />
              Enviar PDF (currículo ou perfil)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUseSample}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              <Sparkles className="size-4" />
              Testar com um exemplo
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={!hasContent || isLoading} className="mt-1">
            {isLoading ? "Analisando…" : "Calcular meu Score Internacional"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
