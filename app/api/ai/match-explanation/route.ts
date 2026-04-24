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
    const {
      volunteerSkills,
      volunteerBio,
      volunteerLocation,
      projectTitle,
      projectDescription,
      projectSkills,
      matchScore,
    } = body

    // Determine match tier to guide the AI's tone and honesty
    const numericScore = typeof matchScore === "number" ? matchScore : 0
    let scoreTier: string
    let toneGuidance: string

    if (numericScore >= 70) {
      scoreTier = "HIGH (70-100%)"
      toneGuidance = "This is a strong match. Highlight the specific skill overlaps and why this volunteer is well-suited. Be genuinely positive."
    } else if (numericScore >= 45) {
      scoreTier = "MODERATE (45-69%)"
      toneGuidance = "This is a partial match. Acknowledge the areas of overlap honestly, but also clearly explain which required skills or qualifications are missing. Be balanced."
    } else if (numericScore >= 20) {
      scoreTier = "LOW (20-44%)"
      toneGuidance = "This is a weak match. Be straightforward about the significant skill gaps. Mention any minor overlaps but emphasize that the volunteer lacks most required skills. Do NOT sugarcoat."
    } else {
      scoreTier = "VERY LOW (below 20%)"
      toneGuidance = "This is a poor match. The volunteer's skills have little to no overlap with what the project needs. Be direct and honest — explain clearly why this is not a good fit. Do NOT be encouraging or positive about the match quality. Focus on what's missing."
    }

    const { output } = await generateText({
      model: openai("gpt-5.2"),
      output: Output.object({
        schema: z.object({
          explanation: z.string().describe("A natural, honest explanation of the match quality — positive for high scores, critical for low scores (2-4 sentences)"),
          strengths: z.array(z.string()).describe("0-3 specific match strengths. Can be empty if match is poor."),
          gaps: z.array(z.string()).describe("0-4 specific skill gaps or reasons for a poor match"),
          compatibilityScore: z.string().describe("A one-word compatibility assessment: Excellent, Strong, Good, Fair, Weak, or Poor"),
        }),
      }),
      prompt: `Analyze the match quality between a volunteer and an NGO project. The algorithm scored this match at ${numericScore}% (${scoreTier}).

YOUR EXPLANATION MUST BE CONSISTENT WITH THE ${numericScore}% SCORE.
${toneGuidance}

VOLUNTEER:
- Skills: ${volunteerSkills?.join(", ") || "Not specified"}
- Bio: ${volunteerBio || "Not provided"}
- Location: ${volunteerLocation || "Not specified"}

PROJECT:
- Title: ${projectTitle}
- Description: ${projectDescription}
- Required Skills: ${projectSkills?.join(", ") || "Not specified"}

RULES:
- If the match score is below 25%, your compatibilityScore MUST be "Weak" or "Poor".
- If the match score is below 25%, strengths should be minimal or empty.
- If the match score is below 25%, gaps should list the specific missing skills.
- Never say "strong passion" or "promising candidate" for a low match — that destroys credibility.
- Compare the volunteer's actual skills against the project's required skills explicitly.
- If there is almost no skill overlap, say so plainly.`,
    })

    return NextResponse.json(output)
  } catch (error) {
    console.error("AI match explanation failed:", error)
    return NextResponse.json({ error: "Failed to generate match explanation" }, { status: 500 })
  }
}
