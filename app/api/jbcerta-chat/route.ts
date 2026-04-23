// =============================================================
// JBCerta — tool-calling agent loop powered by Minimax M2.7
// via the Vercel AI SDK.
//
// Architecture:
//   user msg
//     -> generateText(model=Minimax, tools={search/get/match...},
//                     stopWhen=stepCountIs(N))
//        -> model decides which tool(s) to call
//           -> each tool wraps existing ES + Mongo helpers
//           -> tool results stream back into the model context
//        -> model writes a final natural-language answer
//     -> route returns { message, results }
//        where `results` aggregates every entity the agent looked
//        at, so the UI can render rich cards alongside the text.
//
// Server-only — Minimax key never reaches the browser.
// Sub-agent: matchCandidates tool runs its own scoring LLM call.
// =============================================================

import { NextRequest, NextResponse } from "next/server"
import { generateText, stepCountIs } from "ai"
import type { ModelMessage } from "ai"
import { minimaxModel, MINIMAX_MODEL_ID } from "@/lib/ai/minimax"
import { buildJBCertaTools, createResultBag, type AgentResult } from "@/lib/ai/jbcerta-tools"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_STEPS = 6 // hard cap on tool-loop iterations
const MAX_HISTORY_TURNS = 12

const SYSTEM_PROMPT = `You are JBCerta, the AI concierge for JustBeCause — a platform that connects skilled people ("Impact Agents") with NGOs and meaningful volunteer opportunities.

Reply in the same language the user wrote in. Be warm, concise, direct. No filler.

You have TOOLS that let you read the platform's real data (volunteers, NGOs, opportunities, full profiles, the skill catalog, and a candidate-matching sub-agent). USE THEM. Do not invent people, projects, ids, or skills.

Decision rules:
1. If the user asks to find/discover/recommend/browse people, NGOs, or opportunities → call the appropriate search tool first. Translate vague terms ("a developer") into concrete skill keywords; if unsure which skills exist on the platform, call \`listSkillCatalog\` first.
2. If the user asks for detail, comparison, or a recommendation about specific entities → use \`getVolunteerProfile\`, \`getNGOProfile\`, or \`getOpportunity\` for the top 1–3 candidates BEFORE answering, so your reply is grounded in real bios, hours, and rates.
3. For matchmaking ("who is best for project X?") → call \`matchCandidates\` with the opportunity id; it returns a ranked list with reasons.
4. For greetings, small talk, or platform questions → answer directly with no tool calls.
5. After the tools have given you data, write ONE final reply in plain prose (no JSON, no code fences, no markdown headings). Reference real names from the tool results. Keep it under ~6 sentences unless the user asked for detail.
6. Never repeat a search you already did with the same args. Never call more than ${MAX_STEPS} tools in total. If you have enough information, stop and answer.
7. If a tool errors or returns nothing, say so honestly and offer next steps.`

type IncomingMessage = { role: "user" | "assistant"; content: string }

function sanitizeHistory(raw: unknown): ModelMessage[] {
  if (!Array.isArray(raw)) return []
  const cleaned: ModelMessage[] = []
  for (const m of raw as IncomingMessage[]) {
    if (!m || typeof m.content !== "string") continue
    if (m.role !== "user" && m.role !== "assistant") continue
    cleaned.push({ role: m.role, content: m.content.slice(0, 4000) })
  }
  return cleaned.slice(-MAX_HISTORY_TURNS)
}

export async function POST(req: NextRequest) {
  let history: ModelMessage[] = []
  try {
    const body = await req.json().catch(() => ({}))
    history = sanitizeHistory((body as { messages?: unknown })?.messages)

    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: (err as Error).message },
      { status: 400 }
    )
  }

  const bag = createResultBag()
  const tools = buildJBCertaTools(bag)

  try {
    const startedAt = Date.now()
    const result = await generateText({
      model: minimaxModel(),
      system: SYSTEM_PROMPT,
      messages: history,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      temperature: 0.4,
    })

    const elapsedMs = Date.now() - startedAt

    // Aggregate tool-call telemetry for debugging in dev
    const toolCallNames: string[] = []
    for (const step of result.steps ?? []) {
      for (const call of step.toolCalls ?? []) {
        toolCallNames.push(call.toolName)
      }
    }

    const results: AgentResult[] = bag.list()
    const finalText = (result.text || "").trim()

    return NextResponse.json({
      message: finalText || "I gathered some data — but I couldn't form a reply. Try rephrasing?",
      results,
      meta: {
        model: MINIMAX_MODEL_ID,
        steps: result.steps?.length ?? 0,
        toolCalls: toolCallNames,
        elapsedMs,
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error("[jbcerta-chat] agent failure:", detail)
    const exposeDetail = process.env.NODE_ENV !== "production"
    return NextResponse.json(
      {
        message: exposeDetail
          ? `JBCerta hit an error: ${detail}`
          : "Sorry — I'm having trouble thinking right now. Please try again in a moment.",
        results: bag.list(),
      },
      { status: 200 }
    )
  }
}
