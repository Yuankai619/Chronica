import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

/**
 * Pinned explicitly — the `gpt-5.6` alias resolves to Sol, not Terra.
 */
export const AGENT_MODEL_ID = "gpt-5.6-terra";

export function agentConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function agentModel() {
  const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return provider.responses(AGENT_MODEL_ID);
}

/** Reasoning effort is fixed at medium (the model's own default) across every command. */
export const AGENT_PROVIDER_OPTIONS = {
  openai: { reasoningEffort: "medium" as const },
};
