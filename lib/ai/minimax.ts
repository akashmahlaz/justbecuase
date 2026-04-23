// ============================================================
// Minimax provider for the Vercel AI SDK
// ============================================================
// Minimax exposes an OpenAI-compatible JSON schema but on a
// non-standard path (`/v1/text/chatcompletion_v2`). We bridge
// it via @ai-sdk/openai-compatible.
// ============================================================

import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1"
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ""
export const MINIMAX_MODEL_ID = process.env.MINIMAX_MODEL || "MiniMax-M2.7"

if (!MINIMAX_API_KEY && process.env.NODE_ENV !== "test") {
  console.warn("[minimax] MINIMAX_API_KEY is not set — JBCerta will fail")
}

// Minimax's chat completion endpoint is `/text/chatcompletion_v2`,
// not the OpenAI default `/chat/completions`. The provider lets us
// rewrite the URL the SDK calls.
export const minimax = createOpenAICompatible({
  name: "minimax",
  baseURL: MINIMAX_BASE_URL,
  apiKey: MINIMAX_API_KEY,
  fetch: async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const rewritten = url.replace(/\/chat\/completions(\?|$)/, "/text/chatcompletion_v2$1")
    return fetch(rewritten, init)
  },
})

export const minimaxModel = () => minimax.chatModel(MINIMAX_MODEL_ID)
