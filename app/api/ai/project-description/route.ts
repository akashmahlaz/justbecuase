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
    const { basicTitle, basicDescription, orgName, orgMission, causes } = body

    if (!basicTitle && !basicDescription) {
      return NextResponse.json({ error: "At least a title or description is required" }, { status: 400 })
    }

    const { output } = await generateText({
      model: openai("gpt-5.2"),
      output: Output.object({
        schema: z.object({
          title: z.string().describe("An improved, compelling project title"),
          description: z.string().describe("A detailed project description (150-300 words) that attracts volunteers"),
          requirements: z.array(z.string()).describe("4-6 specific skill requirements"),
          deliverables: z.array(z.string()).describe("3-5 clear deliverables"),
          tags: z.array(z.string()).describe("5-8 relevant tags for searchability"),
          suggestedDuration: z.string().describe("Suggested project duration (e.g., '2-4 weeks')"),
          suggestedTimeCommitment: z.string().describe("Suggested hours per week (e.g., '5-10 hours/week')"),
        }),
      }),
      prompt: `Help an NGO create a compelling project posting that will attract skilled volunteers.

NGO CONTEXT:
- Organization Name: ${orgName || "Not specified"}
- Mission: ${orgMission || "Not specified"}
- Causes: ${causes?.join(", ") || "Not specified"}

PROJECT BASICS:
- Working Title: ${basicTitle || "Untitled"}
- Initial Description: ${basicDescription || "Not provided"}

Generate:
1. An improved, attention-grabbing title
2. A detailed description that clearly communicates the project's impact and what volunteers will do
3. Specific skill requirements
4. Clear deliverables
5. Relevant tags for search
6. Realistic time estimates

The description should:
- Start with the impact/why this matters
- Clearly describe the work involved
- State what success looks like
- Be professional but engaging
- Appeal to skilled professionals who want to make a difference`,
    })

    return NextResponse.json(output)
  } catch (error) {
    console.error("AI project description failed:", error)
    return NextResponse.json({ error: "Failed to generate project description" }, { status: 500 })
  }
}
