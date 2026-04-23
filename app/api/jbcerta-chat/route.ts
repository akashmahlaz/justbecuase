import { NextRequest, NextResponse } from "next/server"

// =============================================================
// JBCerta — conversational AI assistant powered by Minimax
// Server-side only. The Minimax API key NEVER reaches the browser.
// =============================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1"
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2.7"
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ""

type ChatRole = "user" | "assistant" | "system"
type ChatTurn = { role: ChatRole; content: string }

type SearchResult = {
  type: "volunteer" | "ngo" | "opportunity"
  id: string
  title: string
  subtitle?: string
  description?: string
  location?: string
  skills?: string[]
  avatar?: string
  verified?: boolean
  workMode?: string
  volunteerType?: string
  rating?: number
}

const SYSTEM_PROMPT = `You are JBCerta, the friendly AI assistant of JustBeCause — a platform connecting skilled people (Impact Agents) with NGOs and meaningful volunteer opportunities.

Be warm, concise, and useful. Reply in the same language the user wrote.

When the user wants to FIND, DISCOVER, BROWSE or RECOMMEND people, NGOs, projects, jobs or opportunities, you MUST trigger a platform search. Otherwise just chat naturally — answer questions about the platform, give advice, encourage them.

You MUST ALWAYS reply with a single valid JSON object on one line, no markdown, no code fences. Schema:
{"action":"reply"|"search","message":"<your friendly text shown to the user>","query":"<short search keywords if action is search>","type":"all"|"volunteer"|"ngo"|"opportunity"}

- action="reply" → just chat, omit query/type
- action="search" → set query (1–6 keywords) and type. Use "volunteer" for people/skills, "ngo" for organizations/charities, "opportunity" for projects/jobs/gigs, "all" if mixed or unclear.
- The "message" field is the natural-language sentence shown to the user. When searching, write something like "Sure — let me find graphic designers for you…" or "Here are NGOs working in education".

Never wrap your output in code fences. Never include any text outside the JSON object.`

// ---------- helpers ----------

function tryParseJson(text: string): { action?: "reply" | "search"; message?: string; query?: string; type?: string } | null {
  if (!text) return null
  // strip code fences if model added them anyway
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()
  // attempt direct parse, else find first {...}
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) {
      try { return JSON.parse(m[0]) } catch { /* fall through */ }
    }
  }
  return null
}

function originFromRequest(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  if (env) return env.replace(/\/$/, "")
  const proto = req.headers.get("x-forwarded-proto") || "http"
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  return host ? `${proto}://${host}` : "http://localhost:3000"
}

async function runPlatformSearch(
  origin: string,
  query: string,
  type: "all" | "volunteer" | "ngo" | "opportunity",
  limit = 6
): Promise<SearchResult[]> {
  const trimmed = query.trim().slice(0, 200)
  if (!trimmed) return []
  const types = type === "all" ? "volunteer,ngo,opportunity" : type
  const url = `${origin}/api/unified-search?q=${encodeURIComponent(trimmed)}&types=${types}&limit=${limit}`
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    const results: SearchResult[] = (data?.results || []).filter(
      (r: { type?: string }) => r.type === "volunteer" || r.type === "ngo" || r.type === "opportunity"
    )
    if (type !== "all") return results.filter((r) => r.type === type)
    return results
  } catch {
    return []
  }
}

async function callMinimax(messages: ChatTurn[]): Promise<string> {
  if (!MINIMAX_API_KEY) throw new Error("MINIMAX_API_KEY missing")

  const res = await fetch(`${MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages,
      temperature: 0.4,
      top_p: 0.9,
      // M2.7 is a reasoning model — its hidden reasoning_content also consumes
      // completion tokens, so give it room or `content` comes back empty.
      max_tokens: 4096,
      stream: false,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Minimax HTTP ${res.status}: ${body.slice(0, 400)}`)
  }

  const data = await res.json()

  // Minimax wraps API-level errors in base_resp even when HTTP is 200
  const baseStatus: number | undefined = data?.base_resp?.status_code
  if (typeof baseStatus === "number" && baseStatus !== 0) {
    const msg = data?.base_resp?.status_msg || "unknown minimax error"
    throw new Error(`Minimax base_resp ${baseStatus}: ${msg}`)
  }

  // OpenAI-compatible: choices[0].message.content (reasoning_content is separate)
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.reply ??
    ""
  return typeof content === "string" ? content : String(content ?? "")
}

// ---------- handler ----------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const incoming: ChatTurn[] = Array.isArray(body?.messages) ? body.messages : []

    // sanitize: only role+content, last 12 turns max, content under 2k chars
    const history: ChatTurn[] = incoming
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))

    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 })
    }

    const messages: ChatTurn[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history]

    let raw = ""
    try {
      raw = await callMinimax(messages)
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error("[jbcerta-chat] minimax failure:", detail)
      const exposeDetail = process.env.NODE_ENV !== "production"
      return NextResponse.json({
        action: "reply",
        message: exposeDetail
          ? `Minimax is unavailable: ${detail}`
          : "Sorry — I'm having trouble thinking right now. Please try again in a moment.",
        results: [],
      })
    }

    const parsed = tryParseJson(raw)

    // If the model returned nothing usable, give a varied, helpful nudge instead
    // of the same canned line every time.
    if (!parsed || (parsed.action !== "reply" && parsed.action !== "search")) {
      const fallback = raw.trim()
        || "Hmm, I lost my thought there. Could you rephrase what you're looking for?"
      return NextResponse.json({
        action: "reply",
        message: fallback,
        results: [],
      })
    }

    if (parsed.action === "reply") {
      return NextResponse.json({
        action: "reply",
        message: parsed.message || "How can I help?",
        results: [],
      })
    }

    // action === "search"
    const safeType = (["all", "volunteer", "ngo", "opportunity"] as const).includes(parsed.type as never)
      ? (parsed.type as "all" | "volunteer" | "ngo" | "opportunity")
      : "all"
    const safeQuery = (parsed.query || history[history.length - 1].content).trim().slice(0, 200)

    const origin = originFromRequest(req)
    const results = await runPlatformSearch(origin, safeQuery, safeType, 6)

    return NextResponse.json({
      action: "search",
      message: parsed.message || `Here is what I found for "${safeQuery}".`,
      query: safeQuery,
      type: safeType,
      results,
    })
  } catch (err: unknown) {
    console.error("[jbcerta-chat] handler error:", err)
    return NextResponse.json(
      { action: "reply", message: "Something went wrong. Please try again.", results: [] },
      { status: 500 }
    )
  }
}
