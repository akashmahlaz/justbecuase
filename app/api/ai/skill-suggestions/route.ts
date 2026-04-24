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
    const { currentSkills, causes, bio, completedProjects } = body

    const { output } = await generateText({
      model: openai("gpt-5.2"),
      output: Output.object({
        schema: z.object({
          suggestions: z.array(
            z.object({
              skill: z.string().describe("The suggested skill name"),
              category: z.string().describe("Skill category (e.g., Marketing, Technology, Design)"),
              relevance: z.enum(["high", "medium"]).describe("How relevant this skill is to their profile"),
              reason: z.string().describe("Why this skill would be valuable for them"),
              demandLevel: z.enum(["high", "medium", "low"]).describe("Current demand for this skill among NGOs"),
            })
          ).describe("5-8 skill suggestions"),
          profileStrength: z.number().min(0).max(100).describe("Profile strength score from 0 to 100 based on completeness and skill diversity"),
          careerTip: z.string().describe("One actionable career/impact tip"),
        }),
      }),
      prompt: `Analyze a volunteer's profile and suggest skills they should add to become more valuable for NGO projects.

CURRENT PROFILE:
- Existing Skills: ${currentSkills?.join(", ") || "None listed"}
- Causes they care about: ${causes?.join(", ") || "Not specified"}
- Bio: ${bio || "Not provided"}
- Completed Projects: ${completedProjects || 0}

Consider the NGO/nonprofit sector specifically. Suggest skills that:
1. Complement their existing skill set
2. Are in high demand among NGOs
3. Would help them take on more impactful projects
4. Are learnable and actionable

Focus on practical, professional skills relevant to the volunteer consulting/nonprofit space.
Common high-demand NGO skills include: Grant Writing, Digital Marketing, Data Analysis, UX Design, SEO, Project Management, Fundraising Strategy, Financial Modeling, Impact Measurement, Graphic Design, Social Media Strategy, Content Writing, Web Development, Video Production, Public Speaking.`,
    })

    return NextResponse.json(output)
  } catch (error) {
    console.error("AI skill suggestions failed:", error)
    return NextResponse.json({ error: "Failed to generate skill suggestions" }, { status: 500 })
  }
}
