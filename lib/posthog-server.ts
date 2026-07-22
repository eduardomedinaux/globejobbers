import { PostHog } from "posthog-node";
import type { AnalyticsEvent } from "@/lib/analytics";

/**
 * Captura um evento do servidor (ex.: signup_completed em
 * app/auth/callback/route.ts). Cria um client novo por chamada e força o
 * shutdown antes de retornar — em ambiente serverless a função pode
 * encerrar antes do client fazer flush do buffer interno, perdendo o
 * evento (ver docs do posthog-node sobre uso em serverless).
 */
export async function captureServerEvent(
  distinctId: string,
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!apiKey) return;

  const client = new PostHog(apiKey, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST });
  client.capture({ distinctId, event, properties });
  await client.shutdown();
}
