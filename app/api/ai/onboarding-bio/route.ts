import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { name, location, currentBio, linkedinUrl, role, orgName, mission } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const isNGO = role === "ngo"

    const prompt = isNGO
      ? `Write a brief, professional organization description for an NGO onboarding profile.

DETAILS:
- Contact Person: ${name}
- Organization: ${orgName || "Not specified yet"}
- Mission: ${mission || "Not specified yet"}
- Location: ${location || "Not specified"}
- Current bio: ${currentBio || "None"}

Write a 60-100 word professional description that:
1. Sounds authentic and grounded
2. Focuses on what the organization does and aspires to achieve
3. Is suitable for a volunteer-matching platform
4. Does NOT invent specific achievements, numbers, or founding dates
5. If minimal info is given, write a general but warm description they can edit`
      : `Write a brief, honest bio for a NEW volunteer signing up on a social-impact platform.

DETAILS:
- Name: ${name}
- Location: ${location || "Not specified"}
- LinkedIn: ${linkedinUrl || "Not provided"}
- Current bio: ${currentBio || "None"}

CRITICAL: This is a BRAND NEW volunteer with 0 projects and 0 hours. Do NOT:
- Mention "proven track record" or "extensive experience"
- Invent skills, achievements, or specialties
- Use corporate buzzwords

DO:
- Write 60-100 words
- Focus on enthusiasm, willingness to contribute, and learning
- Be warm and genuine
- If location is given, mention it naturally
- Make it easy for them to customize further`

    const { output } = await generateText({
      model: openai("gpt-4o-mini"),
      output: Output.object({
        schema: z.object({
          bio: z.string().describe("A short professional bio (60-100 words)"),
        }),
      }),
      prompt,
    })

    return NextResponse.json(output)
  } catch (error) {
    console.error("Onboarding bio generation failed:", error)
    return NextResponse.json({ error: "Failed to generate bio" }, { status: 500 })
  }
}
