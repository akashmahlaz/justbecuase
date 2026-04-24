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
    const { projectTitle, projectDescription, projectSkills, volunteerName, volunteerSkills, volunteerBio, matchScore } = body

    if (!projectTitle || !projectDescription) {
      return NextResponse.json({ error: "Project title and description are required" }, { status: 400 })
    }

    // Determine honesty level based on match score
    const numericScore = typeof matchScore === "number" ? matchScore : undefined
    let honestyGuidance = ""
    if (numericScore !== undefined) {
      if (numericScore < 30) {
        honestyGuidance = `\n\nIMPORTANT: The algorithm scored this match at only ${numericScore}%. The volunteer lacks most required skills. The cover letter should:\n- Acknowledge the skill gaps honestly\n- Focus on willingness to learn rather than pretending expertise\n- NOT claim expertise the volunteer doesn't have\n- Be shorter (100-150 words) since there's less genuine overlap to discuss`
      } else if (numericScore < 55) {
        honestyGuidance = `\n\nNOTE: The match score is ${numericScore}% (partial fit). The cover letter should be honest about which skills match and which are gaps. Don't oversell.`
      }
    }

    const { output } = await generateText({
      model: openai("gpt-5.2"),
      output: Output.object({
        schema: z.object({
          coverLetter: z.string().describe("A personalized cover letter that honestly reflects the volunteer's fit"),
          tips: z.array(z.string()).describe("3-4 tips to improve the application"),
          keyStrengths: z.array(z.string()).describe("0-3 key strengths based on ACTUAL skill overlap. Can be empty if poor match."),
        }),
      }),
      prompt: `Generate an honest cover letter for a volunteer applying to an NGO project.

PROJECT DETAILS:
- Title: ${projectTitle}
- Description: ${projectDescription}
- Required Skills: ${projectSkills?.join(", ") || "Not specified"}

VOLUNTEER DETAILS:
- Name: ${volunteerName || "The volunteer"}
- Skills: ${volunteerSkills?.join(", ") || "Not specified"}
- Bio: ${volunteerBio || "Not provided"}
${honestyGuidance}

RULES:
1. Compare the volunteer's ACTUAL skills against the required skills explicitly
2. If there's strong overlap, write a confident 200-300 word letter
3. If there's weak overlap, write a shorter honest letter (100-150 words) that acknowledges gaps and emphasizes willingness to learn
4. NEVER claim the volunteer has skills they don't have
5. NEVER say "I have extensive experience in X" if X is not in their skill list
6. If the volunteer's skills don't match, the tips should suggest learning the missing skills before applying
7. keyStrengths should be EMPTY if there is genuinely no skill overlap`,
    })

    return NextResponse.json(output)
  } catch (error) {
    console.error("AI cover letter generation failed:", error)
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 })
  }
}
