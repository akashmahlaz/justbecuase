"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import LocaleLink from "@/components/locale-link"
import { ArrowRight, MapPin, Star, CheckCircle } from "lucide-react"
import { browseVolunteers } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import { useDictionary } from "@/components/dictionary-provider"
import { Skeleton } from "@/components/ui/skeleton"
import type { VolunteerProfileView } from "@/lib/types"

export function FeaturedCandidates() {
  const dict = useDictionary()
  const home = (dict as any).home || {}
  const [candidates, setCandidates] = useState<VolunteerProfileView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    browseVolunteers()
      .then((volunteers) => {
        // Show top candidates — prefer those with avatars, ratings, completed projects
        const sorted = [...volunteers].sort((a, b) => {
          const scoreA = (a.rating || 0) * 2 + (a.completedProjects || 0) + (a.avatar ? 5 : 0)
          const scoreB = (b.rating || 0) * 2 + (b.completedProjects || 0) + (b.avatar ? 5 : 0)
          return scoreB - scoreA
        })
        setCandidates(sorted.slice(0, 8))
      })
      .finally(() => setLoading(false))
  }, [])

  function getSkillLabel(volunteer: VolunteerProfileView) {
    if (!volunteer.skills?.length) return null
    const cat = skillCategories.find((c) => c.id === volunteer.skills[0].categoryId)
    return cat?.name || null
  }

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 block">
              {home.candidatesTag || "Top Talent"}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">
              {home.featuredCandidates || "Browse our Featured Candidates"}
            </h2>
            <p className="text-muted-foreground max-w-xl">
              {home.featuredCandidatesDesc || "Discover skilled professionals ready to contribute their expertise to meaningful causes."}
            </p>
          </div>
          <div className="mt-6 md:mt-0">
            <LocaleLink
              href="/volunteers"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {home.browseAllCandidates || "Browse All Candidates"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </LocaleLink>
          </div>
        </div>

        {/* Candidates Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {home.noCandidatesYet || "No candidates to display yet."}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-10">
            {candidates.map((candidate) => {
              const skill = getSkillLabel(candidate)
              return (
                <LocaleLink
                  key={candidate.id}
                  href={`/volunteers/${candidate.id}`}
                  className="group flex flex-col items-center text-center"
                >
                  {/* Circular Avatar */}
                  <div className="relative mb-3">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden ring-4 ring-background shadow-lg group-hover:ring-primary/30 transition-all">
                      {candidate.avatar ? (
                        <Image
                          src={candidate.avatar}
                          alt={candidate.name || "Impact Agent"}
                          width={112}
                          height={112}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl font-bold text-primary">
                          {candidate.name ? candidate.name.charAt(0).toUpperCase() : "?"}
                        </div>
                      )}
                    </div>
                    {candidate.isVerified && (
                      <CheckCircle className="absolute bottom-0 right-0 h-5 w-5 text-primary bg-background rounded-full" />
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-full">
                    {candidate.name || "Impact Agent"}
                  </h3>

                  {/* Skill */}
                  {skill && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">
                      {skill}
                    </p>
                  )}

                  {/* Location + Rating */}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    {candidate.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {candidate.location.split(",")[0]?.trim()}
                      </span>
                    )}
                    {candidate.rating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                        {candidate.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </LocaleLink>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
