"use client"

import Link from "next/link"
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
} from "lucide-react"
import type { VolunteerProfileView } from "@/lib/types"
import { skillCategories } from "@/lib/skills-data"

interface VolunteerCardProps {
  volunteer: VolunteerProfileView
}

export function VolunteerCard({ volunteer }: VolunteerCardProps) {
  // Get skill names from IDs
  const skillNames = volunteer.skills.slice(0, 3).map((skill) => {
    const category = skillCategories.find((c) => c.id === skill.categoryId)
    const subskill = category?.subskills.find((s) => s.id === skill.subskillId)
    return subskill?.name || skill.subskillId
  })

  const isFreeVolunteer = volunteer.volunteerType === "free"
  const isLocked = !volunteer.isUnlocked && isFreeVolunteer

  return (
    <Card className="group hover:shadow-lg transition-all overflow-hidden">
      <CardContent className="p-0">
        {/* Header with Avatar */}
        <div className="relative p-6 pb-4">
          {/* Volunteer Type Badge */}
          <div className="absolute top-4 right-4">
            {isFreeVolunteer ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                Free Volunteer
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Paid
              </Badge>
            )}
          </div>

          {/* Avatar and Name */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl font-semibold ${
                  isLocked ? "blur-sm" : ""
                }`}
              >
                {volunteer.name
                  ? volunteer.name.charAt(0).toUpperCase()
                  : "V"}
              </div>
              {volunteer.isVerified && (
                <CheckCircle className="absolute -bottom-1 -right-1 h-5 w-5 text-primary bg-background rounded-full" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-foreground truncate ${isLocked ? "blur-sm" : ""}`}>
                {volunteer.name || "Volunteer Profile"}
              </h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                {volunteer.location}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 pb-4 flex items-center gap-4">
          {volunteer.rating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{volunteer.rating.toFixed(1)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{volunteer.completedProjects} projects</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{volunteer.hoursPerWeek} hrs/week</span>
          </div>
        </div>

        {/* Skills */}
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {skillNames.map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {volunteer.skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{volunteer.skills.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Bio Preview - only if unlocked */}
        {volunteer.bio && !isLocked && (
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {volunteer.bio}
            </p>
          </div>
        )}

        {/* Locked Overlay for Free Volunteers */}
        {isLocked && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
              <Lock className="h-4 w-4" />
              <span>Unlock to view full profile & contact</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/volunteers/${volunteer.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Link>
          </Button>
          {isLocked ? (
            <Button className="flex-1">
              <Lock className="h-4 w-4 mr-2" />
              Unlock
            </Button>
          ) : (
            <Button className="flex-1" disabled={!volunteer.canMessage}>
              Message
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
