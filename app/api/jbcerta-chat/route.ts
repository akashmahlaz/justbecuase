// =============================================================
// JBCerta — streaming tool-calling agent powered by Vercel AI SDK.
//
// Streaming architecture:
//   useChat (client)
//     -> POST /api/jbcerta-chat { messages, modelId }
//        -> streamText(model, messages, tools, { ...streaming options })
//           -> streams:
//              • text chunks (the model's prose answer)
//              • reasoning chunks (model's thinking, if supported)
//              • tool-call chunks (which tools were called)
//              • tool-result chunks (tool output)
//           -> UI message stream returns SSE chunks for the AI SDK UI client
//        -> useChat renders message.parts: text, reasoning, tool calls, data
//
// Reasoning display: Vercel AI SDK v3+ streams reasoning as special
// chunks. The client reads them from message.parts where type === "reasoning".
//
// Server-only — API keys never reach the browser.
// =============================================================

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai"
import { NextRequest, NextResponse } from "next/server"
import { buildJBCertaTools, createResultBag } from "@/lib/ai/jbcerta-tools"
import type { JBCertaUIMessage } from "@/lib/ai/jbcerta-ui"
import { getModelForId, MODEL_META, type ModelId } from "@/lib/ai/providers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_STEPS = 6

const SYSTEM_PROMPT = `You are JBCerta, the AI concierge for JustBeCause — a platform that connects skilled people ("Impact Agents") with NGOs and meaningful volunteer opportunities.

Reply in the same language the user wrote in. Be warm, concise, direct. No filler.

You have tools that read the platform's real data: volunteers, NGOs, opportunities, full profiles, the skill catalog, and candidate matching. Use them when the user asks to find, discover, recommend, compare, or inspect people, NGOs, or opportunities. Do not invent people, projects, ids, or skills.

Decision rules:
1. For find/discover/recommend/browse requests, call the relevant search tool first. Translate vague terms into concrete skill keywords. If the skill vocabulary is unclear, call listSkillCatalog first.
2. For details, comparisons, or recommendations about specific entities, call the relevant profile/detail tool for the top 1-3 candidates before answering.
3. For matchmaking against a known opportunity, call matchCandidates.
4. For greetings, small talk, or platform questions, answer directly without tools.
5. After tools return data, write one final plain-language reply. Reference real names from the tool results. Keep it under six sentences unless the user asks for detail.
6. Never repeat a search with the same args. Stop once you have enough information.
7. If a tool errors or returns nothing, say so honestly and offer a practical next step.`

function getValidModelId(request: NextRequest): ModelId {
  const modelId = request.headers.get("x-model-id") as ModelId | null
  return modelId && MODEL_META[modelId] ? modelId : "minimax"
}

function sanitizeMessages(messages: unknown): JBCertaUIMessage[] {
  if (!Array.isArray(messages)) return []

  return messages
    .filter((message): message is JBCertaUIMessage => {
      if (!message || typeof message !== "object") return false
      const candidate = message as { role?: unknown; parts?: unknown }
      return (
        (candidate.role === "user" || candidate.role === "assistant" || candidate.role === "system") &&
        Array.isArray(candidate.parts)
      )
    })
    .slice(-24)
}

export async function POST(request: NextRequest) {
  const modelId = getValidModelId(request)
  const modelLabel = MODEL_META[modelId].label

  let messages: JBCertaUIMessage[] = []
  try {
    const body = await request.json().catch(() => ({}))
    messages = sanitizeMessages((body as { messages?: unknown })?.messages)
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    )
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 })
  }

  const bag = createResultBag()
  const tools = buildJBCertaTools(bag)
  const startedAt = Date.now()
  const modelMessages = await convertToModelMessages(messages)

  const stream = createUIMessageStream<JBCertaUIMessage>({
    execute: ({ writer }) => {
      writer.write({
        type: "data-status",
        id: "jbcerta-status",
        data: { status: "thinking", modelId, modelLabel },
        transient: true,
      })

      const result = streamText({
        model: getModelForId(modelId),
        system: SYSTEM_PROMPT,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
        temperature: 0.4,
        maxRetries: 2,
        onFinish: () => {
          writer.write({
            type: "data-results",
            id: `jbcerta-results-${Date.now()}`,
            data: {
              items: bag.list(),
              modelId,
              modelLabel,
              elapsedMs: Date.now() - startedAt,
            },
          })
          writer.write({
            type: "data-status",
            id: "jbcerta-status",
            data: { status: "complete", modelId, modelLabel },
            transient: true,
          })
        },
      })

      writer.merge(
        result.toUIMessageStream({
          originalMessages: messages,
          sendReasoning: true,
          messageMetadata: ({ part }) => {
            if (part.type === "start") return { createdAt: Date.now(), modelId, modelLabel }
            if (part.type === "finish") {
              return {
                modelId,
                modelLabel,
                totalTokens: part.totalUsage.totalTokens,
              }
            }
          },
        })
      )
    },
  })

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "x-model-id": modelId,
      "x-model-label": modelLabel,
    },
  })
}
