"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, Plus, TrendingUp } from "lucide-react"
import { toast } from "sonner"

interface AISkillSuggestionsProps {
  currentSkills: string[]
  causes: string[]
  bio?: string
  completedProjects?: number
  onAddSkill: (skill: string) => void
}

export function AISkillSuggestions({
  currentSkills,
  causes,
  bio,
  completedProjects,
  onAddSkill,
}: AISkillSuggestionsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<{
    suggestions: Array<{
      skill: string
      category: string
      relevance: string
      reason: string
      demandLevel: string
    }>
    profileStrength: number
    careerTip: string
  } | null>(null)
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set())

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/ai/skill-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSkills,
          causes,
          bio,
          completedProjects,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate")
      const data = await res.json()
      setResult(data)
    } catch {
      toast.error("Failed to get skill suggestions. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleAddSkill(skill: string) {
    onAddSkill(skill)
    setAddedSkills((prev) => new Set(prev).add(skill))
    toast.success(`Added "${skill}" to your skills`)
  }

  const demandColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            AI Skill Recommendations
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on your profile and market demand
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2 border-primary/30 text-primary hover:bg-primary/5 shrink-0 self-start sm:self-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {result ? "Refresh" : "Suggest Skills"}
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-4">
          {/* Profile Strength */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Profile Strength</span>
                <span className="font-medium text-primary">{result.profileStrength}/100</span>
              </div>
              <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${result.profileStrength}%` }}
                />
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            {result.suggestions.map((s, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-background rounded-md border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-foreground">{s.skill}</span>
                    <Badge variant="secondary" className={`text-[10px] ${demandColor(s.demandLevel)}`}>
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                      {s.demandLevel} demand
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.reason}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddSkill(s.skill)}
                  disabled={addedSkills.has(s.skill) || currentSkills.includes(s.skill)}
                  className="h-7 text-xs shrink-0 self-start sm:self-auto gap-1"
                >
                  {addedSkills.has(s.skill) || currentSkills.includes(s.skill) ? (
                    "Added"
                  ) : (
                    <>
                      <Plus className="h-3 w-3" /> Add
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Career Tip */}
          {result.careerTip && (
            <div className="pt-2 border-t border-primary/10">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">💡 Tip:</span> {result.careerTip}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
