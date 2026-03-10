"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import LocaleLink from "@/components/locale-link"
import { ArrowRight, MapPin, Star, CheckCircle, Briefcase } from "lucide-react"
import { browseVolunteers } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import { useDictionary } from "@/components/dictionary-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {home.noCandidatesYet || "No candidates to display yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {candidates.map((candidate) => {
              const skill = getSkillLabel(candidate)
              return (
                <LocaleLink
                  key={candidate.id}
                  href={`/volunteers/${candidate.id}`}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                >
                  {/* Verified badge */}
                  {candidate.isVerified && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  {/* Avatar + Name row */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-primary/40 transition-all">
                        {candidate.avatar ? (
                          <Image
                            src={candidate.avatar}
                            alt={candidate.name || "Impact Agent"}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg font-bold text-primary">
                            {candidate.name ? candidate.name.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                      </div>
                      {candidate.rating > 0 && (
                        <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-background border border-border rounded-full px-1.5 py-0.5 shadow-sm">
                          <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-[10px] font-semibold text-foreground">{candidate.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {candidate.name || "Impact Agent"}
                      </h3>
                      {candidate.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{candidate.location.split(",")[0]?.trim()}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Skill badge + projects */}
                  <div className="flex flex-wrap items-center gap-2 mt-auto">
                    {skill && (
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        {skill}
                      </Badge>
                    )}
                    {(candidate.completedProjects || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        {candidate.completedProjects} projects
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
