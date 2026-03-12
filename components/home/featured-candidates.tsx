"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import LocaleLink from "@/components/locale-link"
import { ArrowRight, Clock, CheckCircle } from "lucide-react"
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
    browseVolunteers({ limit: 15 })
      .then((volunteers) => {
        const sorted = [...volunteers].sort((a, b) => {
          const scoreA = (a.rating || 0) * 2 + (a.completedProjects || 0) + (a.avatar ? 5 : 0)
          const scoreB = (b.rating || 0) * 2 + (b.completedProjects || 0) + (b.avatar ? 5 : 0)
          return scoreB - scoreA
        })
        setCandidates(sorted)
      })
      .finally(() => setLoading(false))
  }, [])

  function getSkillLabel(volunteer: VolunteerProfileView) {
    if (!volunteer.skills?.length) return null
    const cat = skillCategories.find((c) => c.id === volunteer.skills[0].categoryId)
    return cat?.name || null
  }

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <header className="mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-2">
            {home.browseFeaturedCandidates || "Browse our Featured Candidates"}
          </h2>
        </header>

        {/* Card Carousel */}
        {loading ? (
          <div className="flex gap-5 overflow-hidden -mx-4 px-4 md:-mx-6 md:px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[220px] max-w-[260px] flex-shrink-0 rounded-xl border border-border bg-card overflow-hidden">
                <Skeleton className="w-full h-40" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground uppercase tracking-widest text-xs">
              {home.noCandidatesYet || "No candidates to display yet"}
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
              {candidates.map((candidate) => {
                const skill = getSkillLabel(candidate)
                return (
                  <LocaleLink
                    key={candidate.id}
                    href={`/volunteers/${candidate.id}`}
                    className="min-w-[220px] max-w-[260px] flex-shrink-0 snap-start group"
                  >
                    <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all duration-300">
                      {/* Image */}
                      <div className="relative w-full h-40 bg-muted overflow-hidden">
                        {candidate.avatar ? (
                          <Image
                            src={candidate.avatar}
                            alt={candidate.name || "Candidate"}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                            <span className="text-4xl font-bold text-muted-foreground/40">
                              {candidate.name ? candidate.name.charAt(0).toUpperCase() : "?"}
                            </span>
                          </div>
                        )}

                        {/* Category badge */}
                        {skill && (
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-background/90 text-foreground backdrop-blur-sm border border-border">
                            {skill}
                          </span>
                        )}

                        {/* Verified badge */}
                        {candidate.isVerified && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                            <CheckCircle className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {candidate.name || "Impact Agent"}
                        </h3>
                        {candidate.hoursPerWeek && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{candidate.hoursPerWeek}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </LocaleLink>
                )
              })}
            </div>

            {/* Scroll indicator */}
            <div className="flex items-center justify-end mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                scroll <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
