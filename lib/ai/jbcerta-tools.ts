// ============================================================
// JBCerta agent tools
// ============================================================
// Tools the LLM agent can call inside its reasoning loop.
// Each tool wraps existing search / DB helpers and returns
// a compact, agent-friendly JSON shape (we strip large blobs
// like full bios from list views to keep the context tight).
// ============================================================

import { tool, generateText } from "ai"
import { z } from "zod"
import { mongoSearch } from "@/lib/mongo-search"
import {
  volunteerProfilesDb,
  ngoProfilesDb,
  projectsDb,
} from "@/lib/database"
import { skillCategories, causes } from "@/lib/skills-data"
import { minimaxModel } from "@/lib/ai/minimax"

// ============================================================
// Aggregator: every tool that returns entity results pushes
// them here so the route handler can render cards in the UI
// without re-querying.
// ============================================================
export type AgentResult = {
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

export type AgentResultBag = {
  push: (r: AgentResult | AgentResult[]) => void
  list: () => AgentResult[]
}

export function createResultBag(): AgentResultBag {
  const seen = new Set<string>()
  const items: AgentResult[] = []
  return {
    push(r) {
      const arr = Array.isArray(r) ? r : [r]
      for (const x of arr) {
        const k = `${x.type}:${x.id}`
        if (!seen.has(k)) {
          seen.add(k)
          items.push(x)
        }
      }
    },
    list() {
      return items
    },
  }
}

// ============================================================
// Helpers — convert ES hits → compact agent shape
// ============================================================
function hitToAgent(h: {
  id: string
  type: string
  title: string
  subtitle: string
  metadata: Record<string, unknown>
}): AgentResult {
  const m = h.metadata as Record<string, unknown>
  const cityCountry = [m.city, m.country].filter(Boolean).join(", ")
  const skillNames = Array.isArray(m.skillNames) ? (m.skillNames as string[]) : []
  return {
    type: (h.type === "project" ? "opportunity" : (h.type as "volunteer" | "ngo")),
    id: h.id,
    title: h.title,
    subtitle: h.subtitle || undefined,
    location: cityCountry || (m.location as string | undefined),
    skills: skillNames.slice(0, 8),
    avatar: m.avatar as string | undefined,
    verified: Boolean(m.isVerified),
    workMode: m.workMode as string | undefined,
    volunteerType: m.volunteerType as string | undefined,
    rating: typeof m.rating === "number" ? m.rating : undefined,
  }
}

// ============================================================
// TOOLS
// ============================================================
export function buildJBCertaTools(bag: AgentResultBag) {
  return {
    // ----------------------------------------------------------
    searchVolunteers: tool({
      description:
        "Search the JustBeCause directory for skilled people (Impact Agents). " +
        "Use when the user wants to find, recommend, hire, or browse volunteers. " +
        "Returns up to 20 candidates with their skills, location, rating, and verification status. " +
        "Search query supports natural language; filters narrow the results.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(200)
          .describe(
            "Free-text search. Examples: 'react developer', 'graphic designer', 'fundraising expert'. " +
              "Use the user's actual request, not a placeholder."
          ),
        skills: z
          .array(z.string())
          .optional()
          .describe("Optional skill names to require, e.g. ['React','Node.js']."),
        location: z
          .string()
          .optional()
          .describe("Optional city or country filter, e.g. 'Madrid' or 'India'."),
        workMode: z
          .enum(["remote", "onsite", "hybrid"])
          .optional()
          .describe("Optional work mode filter."),
        volunteerType: z
          .enum(["free", "paid", "both"])
          .optional()
          .describe("Optional: 'free' for pro-bono, 'paid' for hourly, 'both' for either."),
        minRating: z.number().min(0).max(5).optional(),
        verifiedOnly: z.boolean().optional(),
        limit: z.number().int().min(1).max(20).optional().default(10),
      }),
      execute: async (args) => {
        const { results, total } = await mongoSearch({
          query: args.query,
          types: ["volunteer"],
          filters: {
            skills: args.skills,
            location: args.location,
            workMode: args.workMode,
            volunteerType: args.volunteerType,
            minRating: args.minRating,
            isVerified: args.verifiedOnly,
          },
          limit: args.limit ?? 10,
          sort: "relevance",
        })
        const items = results.map(hitToAgent)
        bag.push(items)
        return { totalMatches: total, returned: items.length, items }
      },
    }),

    // ----------------------------------------------------------
    searchNGOs: tool({
      description:
        "Search registered NGOs / nonprofits on JustBeCause. " +
        "Use when the user wants to find or recommend organizations to volunteer with, donate to, or partner with.",
      inputSchema: z.object({
        query: z.string().min(1).max(200),
        causes: z
          .array(z.string())
          .optional()
          .describe("Optional cause names like ['education','climate','health']."),
        location: z.string().optional(),
        verifiedOnly: z.boolean().optional(),
        limit: z.number().int().min(1).max(20).optional().default(10),
      }),
      execute: async (args) => {
        const { results, total } = await mongoSearch({
          query: args.query,
          types: ["ngo"],
          filters: {
            causes: args.causes,
            location: args.location,
            isVerified: args.verifiedOnly,
          },
          limit: args.limit ?? 10,
          sort: "relevance",
        })
        const items = results.map(hitToAgent)
        bag.push(items)
        return { totalMatches: total, returned: items.length, items }
      },
    }),

    // ----------------------------------------------------------
    searchOpportunities: tool({
      description:
        "Search open volunteer projects / opportunities posted by NGOs. " +
        "Use when the user is looking for things to do, jobs, gigs, or projects to apply to.",
      inputSchema: z.object({
        query: z.string().min(1).max(200),
        skills: z.array(z.string()).optional(),
        workMode: z.enum(["remote", "onsite", "hybrid"]).optional(),
        location: z.string().optional(),
        limit: z.number().int().min(1).max(20).optional().default(10),
      }),
      execute: async (args) => {
        const { results, total } = await mongoSearch({
          query: args.query,
          types: ["project"],
          filters: {
            skills: args.skills,
            workMode: args.workMode,
            location: args.location,
            status: "active",
          },
          limit: args.limit ?? 10,
          sort: "relevance",
        })
        const items = results.map(hitToAgent)
        bag.push(items)
        return { totalMatches: total, returned: items.length, items }
      },
    }),

    // ----------------------------------------------------------
    getVolunteerProfile: tool({
      description:
        "Fetch the FULL profile of one specific volunteer by their userId. " +
        "Use this when the user asks for detail about a specific person you've already shown them, " +
        "or when comparing two candidates and you need bios, hours, hourly rate, languages, completed projects.",
      inputSchema: z.object({
        userId: z.string().min(1).describe("The volunteer's userId, returned by searchVolunteers as `id`."),
      }),
      execute: async ({ userId }) => {
        const p = await volunteerProfilesDb.findByUserId(userId)
        if (!p) return { found: false, error: "Volunteer profile not found." }
        return {
          found: true,
          profile: {
            userId: p.userId,
            name: p.name,
            headline: p.headline,
            bio: p.bio?.slice(0, 600),
            location: p.location || [p.city, p.country].filter(Boolean).join(", "),
            skills: p.skills || [],
            languages: p.languages || [],
            interests: p.interests || [],
            causes: p.causes || [],
            volunteerType: p.volunteerType,
            workMode: p.workMode,
            availability: p.availability,
            hoursPerWeek: p.hoursPerWeek,
            freeHoursPerMonth: p.freeHoursPerMonth,
            hourlyRate: p.hourlyRate,
            currency: p.currency,
            rating: p.rating,
            totalRatings: p.totalRatings,
            completedProjects: p.completedProjects,
            hoursContributed: p.hoursContributed,
            isVerified: p.isVerified,
            subscriptionPlan: p.subscriptionPlan,
          },
        }
      },
    }),

    // ----------------------------------------------------------
    getNGOProfile: tool({
      description: "Fetch the FULL profile of one NGO by its userId.",
      inputSchema: z.object({
        userId: z.string().min(1).describe("The NGO's userId."),
      }),
      execute: async ({ userId }) => {
        const n = await ngoProfilesDb.findByUserId(userId)
        if (!n) return { found: false, error: "NGO not found." }
        const nx = n as unknown as Record<string, unknown>
        return {
          found: true,
          profile: {
            userId: n.userId,
            orgName: n.orgName || n.organizationName,
            contactPersonName: n.contactPersonName,
            description: n.description?.slice(0, 800),
            mission: n.mission?.slice(0, 600),
            location: (nx.location as string | undefined) || [n.city, n.country].filter(Boolean).join(", "),
            website: n.website,
            causes: n.causes || [],
            typicalSkillsNeeded: n.typicalSkillsNeeded || [],
            acceptRemoteVolunteers: n.acceptRemoteVolunteers,
            acceptOnsiteVolunteers: n.acceptOnsiteVolunteers,
            yearFounded: n.yearFounded,
            teamSize: n.teamSize,
            projectsPosted: n.projectsPosted,
            projectsCompleted: n.projectsCompleted,
            volunteersEngaged: n.volunteersEngaged,
            isVerified: n.isVerified,
          },
        }
      },
    }),

    // ----------------------------------------------------------
    getOpportunity: tool({
      description: "Fetch the FULL details of one project / opportunity by its id.",
      inputSchema: z.object({
        id: z.string().min(1).describe("The project _id."),
      }),
      execute: async ({ id }) => {
        const p = await projectsDb.findById(id)
        if (!p) return { found: false, error: "Opportunity not found." }
        const px = p as unknown as Record<string, unknown>
        return {
          found: true,
          project: {
            id,
            ngoId: p.ngoId,
            title: p.title,
            description: p.description?.slice(0, 800),
            status: p.status,
            skillsRequired: p.skillsRequired || [],
            experienceLevel: p.experienceLevel,
            workMode: p.workMode,
            location: p.location,
            urgency: px.urgency as string | undefined,
            deadline: px.deadline as string | undefined,
            applicantsCount: p.applicantsCount,
            viewsCount: p.viewsCount,
          },
        }
      },
    }),

    // ----------------------------------------------------------
    listSkillCatalog: tool({
      description:
        "Return the platform's full skill catalog grouped by category. " +
        "Useful when the user asks vaguely (e.g. 'I want a developer') and you need to map " +
        "their words onto concrete skill names before searching.",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          categories: skillCategories.map((c) => ({
            id: c.id,
            name: c.name,
            skills: c.subskills.map((s) => s.name),
          })),
          causes: causes.map((c) => c.name),
        }
      },
    }),

    // ----------------------------------------------------------
    // SUB-AGENT: matchCandidates
    // Given an opportunity id, this tool runs its own focused
    // LLM call to fan out, score, and return a ranked list with
    // a one-line justification per candidate.
    // ----------------------------------------------------------
    matchCandidates: tool({
      description:
        "Find and RANK the best volunteers for a specific opportunity. " +
        "Internally: pulls the opportunity's required skills, searches volunteers, then a focused " +
        "scoring model ranks the top candidates with reasons. Use this for matchmaking questions like " +
        "'who is the best fit for project X' or 'find me 3 candidates for this opportunity'.",
      inputSchema: z.object({
        opportunityId: z.string().min(1).describe("The opportunity / project id to match against."),
        topN: z.number().int().min(1).max(8).optional().default(5),
      }),
      execute: async ({ opportunityId, topN }) => {
        const project = await projectsDb.findById(opportunityId)
        if (!project) return { found: false, error: "Opportunity not found." }

        const requiredSkills: string[] = Array.isArray(project.skillsRequired)
          ? (project.skillsRequired as unknown[])
              .map((s) => (typeof s === "string" ? s : (s as { name?: string })?.name))
              .filter(Boolean) as string[]
          : []

        const { results } = await mongoSearch({
          query: project.title || requiredSkills.join(" ") || "volunteer",
          types: ["volunteer"],
          filters: {
            skills: requiredSkills.length > 0 ? requiredSkills : undefined,
            location: project.location || undefined,
            workMode: project.workMode || undefined,
          },
          limit: 15,
          sort: "relevance",
        })

        if (results.length === 0) {
          return { found: true, ranked: [], note: "No candidates matched the required skills." }
        }

        const candidates = results.map(hitToAgent)
        bag.push(candidates)

        // Sub-agent scoring step — focused, cheap, no tool access.
        const scoringPrompt = `Project: ${project.title}
Required skills: ${requiredSkills.join(", ") || "(unspecified)"}
Work mode: ${project.workMode || "any"}
Location: ${project.location || "any"}
Experience level: ${project.experienceLevel || "any"}

Candidates:
${candidates
  .map(
    (c, i) =>
      `${i + 1}. id=${c.id} | name=${c.title} | skills=${(c.skills || []).join(", ")} | location=${c.location || "?"} | rating=${c.rating ?? "?"} | verified=${c.verified ? "yes" : "no"}`
  )
  .join("\n")}

Rank the top ${topN} candidates. For each: give id, score 0-100, and one short reason citing skills overlap, location/work-mode fit, and seniority signals. Return strict JSON: {"ranked":[{"id":"...","score":85,"reason":"..."}]}.`

        try {
          const { text } = await generateText({
            model: minimaxModel(),
            system: "You are a strict scoring engine. Output only valid JSON, no prose, no code fences.",
            prompt: scoringPrompt,
          })
          const cleaned = text
            .trim()
            .replace(/^```(?:json)?/i, "")
            .replace(/```$/, "")
            .trim()
          const parsed = JSON.parse(cleaned) as {
            ranked: { id: string; score: number; reason: string }[]
          }
          const byId = new Map(candidates.map((c) => [c.id, c]))
          const enriched = parsed.ranked
            .filter((r) => byId.has(r.id))
            .slice(0, topN)
            .map((r) => ({
              id: r.id,
              name: byId.get(r.id)!.title,
              score: r.score,
              reason: r.reason,
              skills: byId.get(r.id)!.skills,
              location: byId.get(r.id)!.location,
              verified: byId.get(r.id)!.verified,
            }))
          return { found: true, ranked: enriched, project: { id: opportunityId, title: project.title } }
        } catch (err) {
          // Fallback: return un-scored candidates.
          return {
            found: true,
            ranked: candidates.slice(0, topN).map((c) => ({
              id: c.id,
              name: c.title,
              score: null,
              reason: "Auto-scored (fallback): skill overlap based on Elasticsearch relevance.",
              skills: c.skills,
              location: c.location,
              verified: c.verified,
            })),
            note: `Scoring sub-agent unavailable: ${(err as Error).message}`,
          }
        }
      },
    }),
  }
}

export type JBCertaTools = ReturnType<typeof buildJBCertaTools>
