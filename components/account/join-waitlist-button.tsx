"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export function JoinWaitlistButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    setState("loading");
    track("upgrade_waitlist_clicked", { tool_type: "account_page" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "account_page" }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="text-[13.5px] font-medium text-[#0F4D4A]">Você entrou na lista de espera.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "loading"}
        className="rounded-xl border border-[#E2E2DC] bg-[#FAFAF8] px-4 py-2.5 text-[13.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#F4F4F0] disabled:opacity-60"
      >
        {state === "loading" ? "Entrando…" : "Entrar na lista de espera do Pro"}
      </button>
      {state === "error" && (
        <p className="text-xs text-destructive">Não foi possível agora. Tente de novo.</p>
      )}
    </div>
  );
}
