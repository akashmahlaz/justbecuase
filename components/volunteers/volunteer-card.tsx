"use client"

import LocaleLink from "@/components/locale-link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Star,
  Clock,
  CheckCircle,
  Eye,
  DollarSign,
  MessageSquare,
  Briefcase,
  Heart,
} from "lucide-react"
import type { VolunteerProfileView } from "@/lib/types"
import { skillCategories, causes as allCauses } from "@/lib/skills-data"
import { useDictionary } from "@/components/dictionary-provider"

interface VolunteerCardProps {
  volunteer: VolunteerProfileView
}

export function VolunteerCard({ volunteer }: VolunteerCardProps) {
  const dict = useDictionary()
  const vd = (dict as any).volunteerDetail || {}
  const vl = (dict as any).volunteersListing || {}

  // Top skills — prefer subskill names (more specific), fall back to category
  const skillLabels = (volunteer.skills || []).map((skill) => {
    const category = skillCategories.find((c) => c.id === skill.categoryId)
    const sub = category?.subskills.find((s) => s.id === skill.subskillId)
    return sub?.name || category?.name || skill.subskillId || skill.categoryId
  })
  const uniqueSkills = [...new Set(skillLabels.filter(Boolean))]
  const topSkills = uniqueSkills.slice(0, 4)
  const extraSkills = Math.max(0, uniqueSkills.length - topSkills.length)

  // Cause labels (id -> name lookup; falls back to raw value if it's already a name)
  const causeLabels = (volunteer.causes || [])
    .map((c) => allCauses.find((x) => x.id === c)?.name || c)
    .filter(Boolean)
  const topCauses = causeLabels.slice(0, 2)
  const extraCauses = Math.max(0, causeLabels.length - topCauses.length)

  const isFreeVolunteer = volunteer.volunteerType === "free"
  const isBothVolunteer = volunteer.volunteerType === "both"
  const isPaidVolunteer = volunteer.volunteerType === "paid" || isBothVolunteer

  const displayName = volunteer.name || "Candidate"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <Card className="group relative overflow-hidden border-border/60 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full">
      {/* Subtle accent bar on hover */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <CardContent className="p-5 flex flex-col flex-1 gap-3.5">
        {/* Header: Avatar + Name + Type + Stats */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {volunteer.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={volunteer.avatar}
                alt={displayName}
                width={52}
                height={52}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Hide broken avatar so the initial fallback shows below
                  ;(e.currentTarget as HTMLImageElement).style.display = "none"
                }}
                className="w-13 h-13 rounded-full object-cover ring-2 ring-background shadow-sm bg-muted"
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-gradient-to-br from-primary/25 to-secondary/25 flex items-center justify-center text-lg font-semibold text-primary ring-2 ring-background shadow-sm">
                {initial}
              </div>
            )}
            {volunteer.isVerified && (
              <CheckCircle className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-primary bg-background rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground text-[15px] leading-tight truncate">
                {displayName}
              </h3>
              {isFreeVolunteer ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800 text-[10px] px-1.5 py-0 h-[18px] shrink-0">
                  {vl.proBono || "Pro Bono"}
                </Badge>
              ) : isBothVolunteer ? (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 text-[10px] px-1.5 py-0 h-[18px] shrink-0">
                  Both
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] shrink-0 gap-0.5">
                  <DollarSign className="h-2.5 w-2.5" />{vl.paid || "Paid"}
                </Badge>
              )}
            </div>

            {volunteer.location && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{volunteer.location}</span>
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
              {volunteer.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium text-foreground">{volunteer.rating.toFixed(1)}</span>
                </span>
              )}
              {volunteer.completedProjects > 0 && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  <span>{volunteer.completedProjects} {volunteer.completedProjects === 1 ? "project" : "projects"}</span>
                </span>
              )}
              {volunteer.hoursPerWeek && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{volunteer.hoursPerWeek}h/wk</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {volunteer.bio && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {volunteer.bio}
          </p>
        )}

        {/* Skills */}
        {topSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {topSkills.map((skill, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-[10px] px-2 py-0 h-[20px] font-medium bg-primary/10 text-primary hover:bg-primary/15 border-0"
              >
                {skill}
              </Badge>
            ))}
            {extraSkills > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[20px] font-normal text-muted-foreground">
                +{extraSkills}
              </Badge>
            )}
          </div>
        )}

        {/* Causes */}
        {topCauses.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Heart className="h-3 w-3 text-rose-500 shrink-0" />
            <span className="text-[11px] text-muted-foreground">
              {topCauses.join(", ")}
              {extraCauses > 0 && ` +${extraCauses} more`}
            </span>
          </div>
        )}

        {/* Spacer pushes footer down so all cards align */}
        <div className="flex-1" />

        {/* Footer: rate + actions */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
          {isPaidVolunteer && volunteer.hourlyRate ? (
            <div className="text-xs">
              <span className="font-semibold text-foreground">
                {volunteer.currency || "$"}{volunteer.discountedRate ?? volunteer.hourlyRate}
              </span>
              <span className="text-muted-foreground">/hr</span>
              {volunteer.discountedRate && volunteer.discountedRate < volunteer.hourlyRate && (
                <span className="ml-1 text-[10px] text-muted-foreground line-through">
                  {volunteer.currency || "$"}{volunteer.hourlyRate}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {isFreeVolunteer ? "Available pro bono" : "Open to work"}
            </span>
          )}

          <div className="flex gap-1.5">
            <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs">
              <LocaleLink href={`/volunteers/${volunteer.id}`}>
                <Eye className="h-3.5 w-3.5 mr-1" />
                {vd.viewProfile || "View"}
              </LocaleLink>
            </Button>
            <Button asChild size="sm" className="h-8 px-2.5 text-xs">
              <LocaleLink href={`/volunteers/${volunteer.id}?action=message`}>
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                {vd.message || "Message"}
              </LocaleLink>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
