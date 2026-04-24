"use client"

import Image from "next/image"
import LocaleLink from "@/components/locale-link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Star,
  Clock,
  Lock,
  CheckCircle,
  Eye,
  DollarSign,
  MessageSquare,
  Briefcase,
} from "lucide-react"
import type { VolunteerProfileView } from "@/lib/types"
import { skillCategories } from "@/lib/skills-data"
import { useDictionary } from "@/components/dictionary-provider"

interface VolunteerCardProps {
  volunteer: VolunteerProfileView
}

export function VolunteerCard({ volunteer }: VolunteerCardProps) {
  const dict = useDictionary()
  const vd = (dict as any).volunteerDetail || {}
  const vl = (dict as any).volunteersListing || {}

  // Get short skill category names (not long subskill names)
  const skillLabels = volunteer.skills.slice(0, 3).map((skill) => {
    const category = skillCategories.find((c) => c.id === skill.categoryId)
    return category?.name || skill.categoryId
  })
  // Deduplicate (multiple subskills from same category)
  const uniqueSkills = [...new Set(skillLabels)].slice(0, 2)
  const extraCount = volunteer.skills.length - uniqueSkills.length

  const isFreeVolunteer = volunteer.volunteerType === "free"
  const isBothVolunteer = volunteer.volunteerType === "both"
  const isLocked = !volunteer.isUnlocked

  return (
    <Card className="group hover:shadow-md hover:border-primary/20 transition-all duration-200 flex flex-col h-full">
      <CardContent className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Row 1: Avatar + Info */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {volunteer.avatar && !isLocked ? (
              <Image
                src={volunteer.avatar}
                alt={volunteer.name || "Candidate (Impact Agent)"}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-semibold text-primary ${
                  isLocked ? "blur-sm" : ""
                }`}
              >
                {volunteer.name ? volunteer.name.charAt(0).toUpperCase() : "V"}
              </div>
            )}
            {volunteer.isVerified && (
              <CheckCircle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-primary bg-background rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-foreground text-sm leading-tight truncate ${isLocked ? "blur-sm" : ""}`}>
                {volunteer.name || "Candidate (Impact Agent)"}
              </h3>
              {isFreeVolunteer ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800 text-[10px] px-1.5 py-0 h-[18px] flex-shrink-0">
                  {vl.proBono || "Pro Bono"}
                </Badge>
              ) : isBothVolunteer ? (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 text-[10px] px-1.5 py-0 h-[18px] flex-shrink-0">
                  Both
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] flex-shrink-0">
                  <DollarSign className="h-2.5 w-2.5" />{vl.paid || "Paid"}
                </Badge>
              )}
            </div>
            {volunteer.location && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{volunteer.location}</span>
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Stats */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {volunteer.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-foreground">{volunteer.rating.toFixed(1)}</span>
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Briefcase className="h-3 w-3" />
            {volunteer.completedProjects}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {volunteer.hoursPerWeek} hrs/wk
          </span>
        </div>

        {/* Row 3: Skills — single line, truncated */}
        <div className="flex items-center gap-1 overflow-hidden h-[20px]">
          {uniqueSkills.map((skill, index) => (
            <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0 h-[18px] font-normal truncate max-w-[120px] flex-shrink-0">
              {skill}
            </Badge>
          ))}
          {extraCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[18px] font-normal text-muted-foreground flex-shrink-0">
              +{extraCount}
            </Badge>
          )}
        </div>

        {/* Row 4: Bio / Locked — grows to equalize cards */}
        <div className="flex-1">
          {isLocked ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5 rounded-md">
              <Lock className="h-3 w-3 flex-shrink-0" />
              <span>{vd.proRequired || "Pro subscription required"}</span>
            </div>
          ) : volunteer.bio ? (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {volunteer.bio}
            </p>
          ) : null}
        </div>

        {/* Row 5: Actions — always at bottom */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs">
            <LocaleLink href={`/volunteers/${volunteer.id}`}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              {vd.viewProfile || "View"}
            </LocaleLink>
          </Button>
          {isLocked ? (
            <Button size="sm" className="flex-1 h-8 text-xs" asChild>
              <LocaleLink href="/pricing">
                {vd.subscribeToView || "Subscribe"}
              </LocaleLink>
            </Button>
          ) : (
            <Button size="sm" className="flex-1 h-8 text-xs" disabled={!volunteer.canMessage}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              {vd.message || "Message"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
