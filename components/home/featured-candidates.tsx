"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import LocaleLink from "@/components/locale-link"
import { ArrowRight, Clock, CheckCircle, MapPin, Star, ChevronLeft, ChevronRight } from "lucide-react"
import { browseVolunteers } from "@/lib/actions"
import { skillCategories, resolveSkillName } from "@/lib/skills-data"
import { useDictionary } from "@/components/dictionary-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { VolunteerProfileView } from "@/lib/types"

export function FeaturedCandidates() {
  const dict = useDictionary()
  const home = (dict as any).home || {}
  const [candidates, setCandidates] = useState<VolunteerProfileView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Fetch a wider pool, then keep only candidates with profile pictures.
    browseVolunteers({ limit: 60 })
      .then((volunteers) => {
        const withPhoto = volunteers.filter((v) => Boolean(v.avatar))
        const sorted = [...withPhoto].sort((a, b) => {
          const scoreA = (a.rating || 0) * 2 + (a.completedProjects || 0)
          const scoreB = (b.rating || 0) * 2 + (b.completedProjects || 0)
          return scoreB - scoreA
        })
        setCandidates(sorted.slice(0, 15))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  function getSkillLabel(volunteer: VolunteerProfileView) {
    if (!volunteer.skills?.length) return null
    const cat = skillCategories.find((c) => c.id === volunteer.skills[0].categoryId)
    return cat?.name || null
  }

  if (error) {
    return (
      <section className="py-24 bg-background overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 text-center py-12">
          <p className="text-muted-foreground mb-4">{home.failedToLoad || "Failed to load featured candidates."}</p>
          <button onClick={() => { setError(false); setLoading(true); browseVolunteers({ limit: 15 }).then(v => { const sorted = [...v].sort((a, b) => ((b.rating || 0) * 2 + (b.completedProjects || 0) + (b.avatar ? 5 : 0)) - ((a.rating || 0) * 2 + (a.completedProjects || 0) + (a.avatar ? 5 : 0))); setCandidates(sorted) }).catch(() => setError(true)).finally(() => setLoading(false)) }} className="text-sm text-primary hover:underline">
            {home.retry || "Retry"}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-border pb-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-4">
              {home.browseFeaturedCandidates || "Browse our Featured Candidates"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {home.featuredCandidatesDesc || "Hand-picked Candidates ready to contribute. Verified profiles, proven skills, real availability."}
            </p>
          </div>

          <div className="mt-8 md:mt-0">
            <LocaleLink
              href="/impact-agents"
              className="group flex items-center gap-3 text-xs uppercase tracking-widest font-bold text-foreground transition-all"
            >
              {home.browseAllCandidates || "Browse All Candidates"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-3" />
            </LocaleLink>
          </div>
        </header>

        {/* Card Carousel */}
        {loading ? (
          <div className="flex gap-5 overflow-hidden -mx-4 px-4 md:-mx-6 md:px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[280px] max-w-[320px] flex-shrink-0 rounded-xl border border-border bg-card overflow-hidden">
                <Skeleton className="w-full h-48" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
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
            {/* Fade edges — stretch to match scroll container's negative margins */}
            <div className="hidden md:block absolute -left-6 top-0 bottom-0 w-24 bg-linear-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
            <div className="hidden md:block absolute -right-6 top-0 bottom-0 w-24 bg-linear-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background/90 border border-border rounded-full p-2 shadow-md hover:bg-muted transition-colors hidden md:flex items-center justify-center -ml-4"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-background/90 border border-border rounded-full p-2 shadow-md hover:bg-muted transition-colors hidden md:flex items-center justify-center -mr-4"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
              {candidates.map((candidate, index) => {
                const skill = getSkillLabel(candidate)
                const subskills = candidate.skills?.slice(0, 3).map(s => resolveSkillName(s.subskillId)) || []
                return (
                  <LocaleLink
                    key={candidate.id}
                    href={`/volunteers/${candidate.id}`}
                    className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-start group"
                  >
                    <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
                      {/* Image */}
                      <div className="relative w-full h-48 bg-muted overflow-hidden">
                        {candidate.avatar ? (
                          <Image
                            src={candidate.avatar}
                            alt={candidate.name || "Candidate"}
                            fill
                            sizes="320px"
                            priority={index < 4}
                            loading={index < 4 ? "eager" : "lazy"}
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                            <span className="text-5xl font-bold text-muted-foreground/30">
                              {candidate.name ? candidate.name.charAt(0).toUpperCase() : "?"}
                            </span>
                          </div>
                        )}

                        {/* Category badge */}
                        {skill && (
                          <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-background/90 text-foreground backdrop-blur-sm border border-border">
                            {skill}
                          </span>
                        )}

                        {/* Verified badge */}
                        {candidate.isVerified && (
                          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {candidate.name || "Candidate"}
                        </h3>

                        {/* Location & Rating */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {candidate.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {candidate.location.split(",")[0]?.trim()}
                            </span>
                          )}
                          {(candidate.rating ?? 0) > 0 && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              {(candidate.rating ?? 0).toFixed(1)}
                            </span>
                          )}
                          {candidate.hoursPerWeek && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Clock className="h-3 w-3" />
                              {candidate.hoursPerWeek}
                            </span>
                          )}
                        </div>

                        {/* Skills */}
                        {subskills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {subskills.map((s) => (
                              <Badge key={s} variant="outline" className="text-[10px] px-2 py-0.5 font-normal bg-muted/50">
                                {s}
                              </Badge>
                            ))}
                            {(candidate.skills?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-normal text-muted-foreground">
                                +{candidate.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </LocaleLink>
                )
              })}
            </div>


          </div>
        )}
      </div>
    </section>
  )
}
