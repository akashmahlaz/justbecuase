import type { ModelId } from "@/lib/ai/providers"

export const JBCERTA_MODEL_STORAGE_KEY = "jb_jbcerta_model"

export const MODEL_IDS: ModelId[] = ["minimax", "openai", "google"]

export const SUGGESTIONS = [
  "Find me a graphic designer in Madrid",
  "Show NGOs working on education",
  "Are there remote video editing opportunities?",
  "Recommend volunteers for marketing",
  "Best match for an education project?",
]

export const PLACEHOLDER_PROMPTS = [
  "Search for NGOs working on climate...",
  "Find a React developer in Madrid...",
  "Recommend a fundraising expert...",
  "Who can help me with grant writing?",
  "Show remote volunteer opportunities...",
  "Compare two designers for my project...",
]

export const TOOL_LABELS: Record<string, string> = {
  searchVolunteers: "Searching volunteers",
  searchNGOs: "Searching NGOs",
  searchOpportunities: "Searching opportunities",
  getVolunteerProfile: "Reading profile",
  getNGOProfile: "Reading NGO",
  getOpportunity: "Reading opportunity",
  listSkillCatalog: "Browsing skills",
  matchCandidates: "Ranking candidates",
}
