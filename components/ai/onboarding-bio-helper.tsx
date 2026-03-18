"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, Check, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface OnboardingBioHelperProps {
  name: string
  location?: string
  currentBio?: string
  linkedinUrl?: string
  /** Pass "volunteer" or "ngo" to tailor the prompt */
  role: "volunteer" | "ngo"
  /** Extra context — for NGO this is orgName + mission */
  extraContext?: Record<string, string>
  onApply: (bio: string) => void
}

export function OnboardingBioHelper({
  name,
  location,
  currentBio,
  linkedinUrl,
  role,
  extraContext,
  onApply,
}: OnboardingBioHelperProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedBio, setGeneratedBio] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  async function handleGenerate() {
    if (!name?.trim()) {
      toast.error("Please enter your name first")
      return
    }

    setIsGenerating(true)
    setApplied(false)
    try {
      const res = await fetch("/api/ai/onboarding-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location,
          currentBio,
          linkedinUrl,
          role,
          ...extraContext,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate")
      const data = await res.json()
      setGeneratedBio(data.bio)
    } catch {
      toast.error("Failed to generate. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleApply() {
    if (generatedBio) {
      onApply(generatedBio)
      setApplied(true)
      toast.success("Bio applied! Feel free to edit it.")
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating...
          </>
        ) : generatedBio ? (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Fill with AI
          </>
        )}
      </Button>

      {generatedBio && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI Suggestion
            </span>
            <Button
              type="button"
              size="sm"
              variant={applied ? "ghost" : "default"}
              onClick={handleApply}
              disabled={applied}
              className="h-7 text-xs gap-1.5"
            >
              {applied ? (
                <>
                  <Check className="h-3 w-3" /> Applied
                </>
              ) : (
                "Use This"
              )}
            </Button>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{generatedBio}</p>
        </div>
      )}
    </div>
  )
}
