// ============================================================
// JBCerta Model Providers
// Supports OpenAI, Google (Gemini), and Minimax via Vercel AI SDK.
// The route handler selects the active provider based on the
// x-model-name header sent from the client.
// ============================================================

import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

// --- Minimax ------------------------------------------------
// Minimax uses a non-standard path (/text/chatcompletion_v2).
// We bridge it via @ai-sdk/openai-compatible.
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1"
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ""
export const MINIMAX_MODEL_ID = process.env.MINIMAX_MODEL || "MiniMax-M2.7"

if (!MINIMAX_API_KEY && process.env.NODE_ENV !== "test") {
  console.warn("[jbcerta] MINIMAX_API_KEY is not set — Minimax calls will fail")
}

export const minimaxProvider = createOpenAICompatible({
  name: "minimax",
  baseURL: MINIMAX_BASE_URL,
  apiKey: MINIMAX_API_KEY,
  fetch: async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    const rewritten = url.replace(/\/chat\/completions(\?|$)/, "/text/chatcompletion_v2$1")
    return fetch(rewritten, init)
  },
})

export const minimaxChatModel = () => minimaxProvider.chatModel(MINIMAX_MODEL_ID)

// --- OpenAI -------------------------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
export const OPENAI_MODEL_ID = process.env.OPENAI_MODEL || "gpt-4o"

const openaiProvider = createOpenAI({ apiKey: OPENAI_API_KEY })
export const openAIChatModel = () => openaiProvider.chat(OPENAI_MODEL_ID)

// --- Google (Gemini) ----------------------------------------
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
export const GOOGLE_MODEL_ID = process.env.GOOGLE_MODEL || "gemini-2.0-flash"

const googleProvider = createGoogleGenerativeAI({ apiKey: GOOGLE_API_KEY })
export const googleChatModel = () => googleProvider.chat(GOOGLE_MODEL_ID)

// --- Registry -----------------------------------------------
export type ModelId = "minimax" | "openai" | "google"

export const MODEL_META: Record<
  ModelId,
  { label: string; modelId: string; provider: string }
> = {
  minimax: {
    label: "MiniMax M2.7",
    modelId: MINIMAX_MODEL_ID,
    provider: "minimax",
  },
  openai: {
    label: "GPT-4o",
    modelId: OPENAI_MODEL_ID,
    provider: "openai",
  },
  google: {
    label: "Gemini 2.0 Flash",
    modelId: GOOGLE_MODEL_ID,
    provider: "google",
  },
}

export function getModelForId(id: ModelId) {
  switch (id) {
    case "minimax":
      return minimaxChatModel()
    case "openai":
      return openAIChatModel()
    case "google":
      return googleChatModel()
  }
}
