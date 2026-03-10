"use client"

import { useState, useEffect, useRef } from "react"
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
  const [activeIndex, setActiveIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Auto-advance with ref to avoid stale closures
  useEffect(() => {
    if (candidates.length === 0) return
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % candidates.length)
    }, 5000)
    timerRef.current = id
    return () => clearInterval(id)
  }, [candidates.length])

  const pause = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  const resume = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (candidates.length === 0) return
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % candidates.length)
    }, 5000)
    timerRef.current = id
  }

  function getSkillLabel(volunteer: VolunteerProfileView) {
    if (!volunteer.skills?.length) return null
    const cat = skillCategories.find((c) => c.id === volunteer.skills[0].categoryId)
    return cat?.name || null
  }

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-border pb-8">
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-4 block">
              {home.candidatesTag || "Selection . 02"}
            </span>
            <h2 className="text-4xl md:text-5xl font-medium text-foreground tracking-tighter mb-6">
              {home.featuredCandidates || "Featured Candidates"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {home.featuredCandidatesDesc || "Skilled professionals ready to contribute their expertise to meaningful causes worldwide."}
            </p>
          </div>
          <div className="mt-8 md:mt-0">
            <LocaleLink
              href="/volunteers"
              className="group flex items-center gap-3 text-xs uppercase tracking-widest font-bold text-foreground transition-all"
            >
              {home.browseAllCandidates || "Browse All Candidates"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-3" />
            </LocaleLink>
          </div>
        </header>

        {/* Carousel */}
        {loading ? (
          <div className="flex items-center justify-between w-full max-w-5xl mx-auto px-2 py-4">
            {[60, 80, 112, 160, 112, 80, 60].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <Skeleton className="rounded-full" style={{ width: s, height: s }} />
                {i === 3 && (
                  <>
                    <Skeleton className="h-4 w-24 mt-2" />
                    <Skeleton className="h-3 w-16" />
                  </>
                )}
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
          <div
            onMouseEnter={pause}
            onMouseLeave={resume}
          >
            {/* Avatar row — 7 visible, fills width */}
            <div className="flex items-center justify-between w-full max-w-5xl mx-auto px-2">
              {(() => {
                const total = candidates.length
                const slots = [-3, -2, -1, 0, 1, 2, 3]
                return slots.map((offset) => {
                  let idx = (activeIndex + offset + total) % total
                  const candidate = candidates[idx]
                  const isCenter = offset === 0
                  const absDist = Math.abs(offset)

                  // Sizes: center 160px, ±1 = 110px, ±2 = 80px, ±3 = 60px
                  const avatarSize = isCenter
                    ? "w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40"
                    : absDist === 1
                    ? "w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
                    : absDist === 2
                    ? "w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20"
                    : "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16"
                  const imgSize = isCenter ? 160 : absDist === 1 ? 112 : absDist === 2 ? 80 : 64
                  const avatarOpacity = isCenter ? "opacity-100" : absDist === 1 ? "opacity-70" : absDist === 2 ? "opacity-45" : "opacity-25"

                  const avatarContent = (
                    <div className={`rounded-full overflow-hidden bg-muted border-2 transition-all duration-500 ${avatarSize} ${
                      isCenter ? "border-primary/40 shadow-lg" : "border-border"
                    }`}>
                      {candidate.avatar ? (
                        <Image
                          src={candidate.avatar}
                          alt={candidate.name || "Candidate"}
                          width={imgSize}
                          height={imgSize}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center font-semibold text-muted-foreground ${isCenter ? "text-xl" : "text-sm"}`}>
                          {candidate.name ? candidate.name.charAt(0).toUpperCase() : "?"}
                        </div>
                      )}
                    </div>
                  )

                  return isCenter ? (
                    <LocaleLink
                      key={`${idx}-${offset}`}
                      href={`/volunteers/${candidate.id}`}
                      className={`flex-shrink-0 cursor-pointer transition-all duration-500 ${avatarOpacity}`}
                    >
                      {avatarContent}
                    </LocaleLink>
                  ) : (
                    <div
                      key={`${idx}-${offset}`}
                      className={`flex-shrink-0 cursor-pointer transition-all duration-500 ${avatarOpacity}`}
                      onClick={() => setActiveIndex(idx)}
                    >
                      {avatarContent}
                    </div>
                  )
                })
              })()}
            </div>

            {/* Center candidate info — below the avatar row */}
            {(() => {
              const candidate = candidates[activeIndex]
              if (!candidate) return null
              const skill = getSkillLabel(candidate)
              return (
                <div className="flex flex-col items-center mt-5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-semibold text-foreground">
                      {candidate.name || "Impact Agent"}
                    </h3>
                    {candidate.isVerified && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  {skill && (
                    <p className="text-sm text-muted-foreground mt-1">{skill}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {candidate.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {candidate.location.split(",")[0]?.trim()}
                      </span>
                    )}
                    {(candidate.rating ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {(candidate.rating ?? 0).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-1.5 mt-6">
              {candidates.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-6 h-1.5 bg-primary"
                      : "w-1.5 h-1.5 bg-border hover:bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
