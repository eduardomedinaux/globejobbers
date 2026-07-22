"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    // Full reload garante que o middleware/layout vejam a sessão já limpa.
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded-lg border border-[#E2E2DC] bg-white px-3.5 py-2 text-[13.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8] disabled:opacity-50"
    >
      {isLoading ? "Saindo…" : "Sair"}
    </button>
  );
}
