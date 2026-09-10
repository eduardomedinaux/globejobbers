"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// Responder FALANDO (decisão de 11/set): entrevista é falada — digitar
// parágrafos em inglês é dever de casa, não treino. Usamos o reconhecimento
// de fala do PRÓPRIO navegador (Web Speech API): zero fornecedor novo, zero
// áudio armazenado, custo zero. A transcrição cai no campo e o usuário
// ajusta antes de enviar. Sem suporte (Safari/Firefox), o campo orienta
// quais navegadores usar e a digitação segue funcionando.

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function joinWithSpace(base: string, extra: string): string {
  if (!extra) return base;
  if (!base) return extra;
  return base.endsWith(" ") || base.endsWith("\n") ? base + extra : `${base} ${extra}`;
}

export function SpeechAnswerField({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  // null = ainda não checou (evita mismatch de hidratação SSR/client).
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Texto que já estava no campo quando a escuta começou. */
  const baseRef = useRef("");
  /** Trechos finais reconhecidos na escuta corrente. */
  const finalRef = useRef("");

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    setSpeechError(null);
    baseRef.current = value;
    finalRef.current = "";

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      finalRef.current = finalText;
      onChange(joinWithSpace(joinWithSpace(baseRef.current, finalText.trim()), interimText.trim()));
    };
    recognition.onend = () => {
      // Consolida o que foi reconhecido (o navegador para sozinho após
      // silêncio longo — o botão volta ao normal e dá pra retomar).
      baseRef.current = joinWithSpace(baseRef.current, finalRef.current.trim());
      finalRef.current = "";
      onChange(baseRef.current);
      setListening(false);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSpeechError(
          "O navegador bloqueou o microfone. Libere a permissão de microfone pra este site e tente de novo.",
        );
      } else if (event.error === "no-speech") {
        setSpeechError("Não captei nada — fala mais perto do microfone e tenta de novo.");
      } else {
        setSpeechError("O reconhecimento de fala falhou agora. Tenta de novo — ou digita, que funciona igual.");
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => {
            if (!listening) onChange(e.target.value);
          }}
          rows={7}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-12 text-[14px] leading-[1.6]"
        />
        {supported === true && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={disabled}
            aria-label={listening ? "Parar de ouvir" : "Responder falando"}
            title={listening ? "Parar de ouvir" : "Responder falando"}
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              listening
                ? "animate-pulse border-[#B4372E] bg-[#B4372E] text-white"
                : "border-[#D8E5E2] bg-white text-[#0F4D4A] hover:bg-[#EAF1EF]"
            }`}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
      </div>

      {supported === true && (
        <p className="text-[12.5px] leading-[1.55] text-[#8A8A85]">
          {listening ? (
            <span className="font-medium text-[#B4372E]">
              Ouvindo… responda em voz alta, em inglês. Clique no botão pra parar.
            </span>
          ) : (
            <>
              <strong className="font-semibold text-[#6E6E72]">Treine falando:</strong> clique no
              microfone e responda em voz alta — a transcrição aparece aqui e você ajusta o que
              quiser antes de enviar.
            </>
          )}
        </p>
      )}

      {supported === false && (
        <div className="rounded-xl border border-[#EFE3C8] bg-[#FBF7EC] px-4 py-3 text-[12.5px] leading-[1.6] text-[#7A6A3C]">
          <strong className="font-semibold">Quer responder falando?</strong> Seu navegador não tem
          reconhecimento de fala. Use o <strong>Chrome</strong> ou o <strong>Edge</strong> (no
          computador ou no Android) pra falar em vez de digitar. No iPhone/Safari, o caminho é o
          microfone do teclado do celular — ou digitar mesmo, que funciona igual.
        </div>
      )}

      {speechError && <p className="text-[12.5px] text-destructive">{speechError}</p>}
    </div>
  );
}
