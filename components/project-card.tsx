"use client"

import LocaleLink from "@/components/locale-link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, ArrowUpRight, Star, MapPin, Clock, DollarSign, Calendar, Briefcase, GraduationCap, Globe, Users, ExternalLink } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"

interface Project {
  id: string
  title: string
  ngo: {
    name: string
    logo?: string
    verified?: boolean
  }
  description: string
  skills: string[]
  timeCommitment: string
  projectType: string
  location: string
  deadline?: string
  applicants: number
  postedAt?: string
  status?: string
  matchScore?: number
  matchReasons?: string[]
  salary?: string
  workMode?: string
  duration?: string
  experienceLevel?: string
  compensationType?: string
  externalUrl?: string
  _source?: string
  _platform?: string
}

// Clean up scraped descriptions that contain HTML/metadata noise
function cleanDescription(desc: string): string {
  if (!desc) return ""
  // Strip lines that look like metadata: "Organization", "Posted", "Closing date", etc.
  const cleaned = desc
    .replace(/\n\s*\n/g, "\n")
    .replace(/^\s*(Organization|Posted|Closing date|Location)[\s\S]*$/gm, "")
    .replace(/<[^>]+>/g, "")
    .trim()
  // If still noisy or same as title, return empty
  if (cleaned.length < 15) return ""
  return cleaned
}

const experienceLabels: Record<string, string> = {
  entry: "Entry Level",
  junior: "Junior",
  intermediate: "Mid Level",
  mid: "Mid Level",
  senior: "Senior",
  expert: "Expert",
}

const typeLabels: Record<string, { label: string; color: string }> = {
  "short-term": { label: "Short-term", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  "long-term": { label: "Long-term", color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  consultation: { label: "Consultation", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  volunteer: { label: "Volunteer", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  stipend: { label: "Stipend", color: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400" },
}

export function ProjectCard({ project }: { project: Project }) {
  const dict = useDictionary()
  const t = (dict as any).common || {}

  const href = project._source === "external"
    ? `/projects/ext/${project.id.replace("ext-", "")}`
    : `/projects/${project.id}`

  const description = cleanDescription(project.description)
  const location = project.workMode || project.location
  const time = project.timeCommitment || project.duration
  const pay = project.salary
    ? (project.salary.length > 28 ? project.salary.slice(0, 28) + "…" : project.salary)
    : null
  const typeInfo = typeLabels[project.projectType] || typeLabels[project.compensationType || ""] || null
  const expLabel = experienceLabels[project.experienceLevel || ""] || null

  return (
    <LocaleLink href={href} className="block group h-full">
      <Card className="h-full px-5 py-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col">
        {/* Header: Org info + type badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="size-9 rounded-lg shrink-0 border">
              <AvatarImage src={project.ngo?.logo || ""} alt={project.ngo?.name || ""} />
              <AvatarFallback className="rounded-lg text-xs font-semibold bg-muted">
                {(project.ngo?.name || "O").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-foreground truncate">
                  {project.ngo?.name || "Organization"}
                </span>
                {project.ngo?.verified && <CheckCircle className="h-3 w-3 text-primary shrink-0" />}
              </div>
              {project._platform && (
                <span className="text-[10px] text-muted-foreground capitalize">{project._platform}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {project.matchScore != null && project.matchScore > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`text-[10px] font-semibold gap-0.5 ${
                      project.matchScore >= 75 ? "border-green-300 text-green-700 dark:border-green-800 dark:text-green-400" :
                      project.matchScore >= 50 ? "border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-400" :
                      "border-orange-300 text-orange-600 dark:border-orange-800 dark:text-orange-400"
                    }`}>
                      <Star className="h-2.5 w-2.5" />
                      {Math.round(project.matchScore)}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {project.matchReasons?.length
                      ? project.matchReasons.join(", ")
                      : `${Math.round(project.matchScore)}% match`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {project._source === "external" && (
              <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {project.title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground mb-3">
          {location && (
            <span className="flex items-center gap-1.5 capitalize truncate">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              {location}
            </span>
          )}
          {time && (
            <span className="flex items-center gap-1.5 truncate">
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              {time}
            </span>
          )}
          {expLabel && (
            <span className="flex items-center gap-1.5 truncate">
              <GraduationCap className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              {expLabel}
            </span>
          )}
          {pay && (
            <span className="flex items-center gap-1.5 truncate">
              <DollarSign className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              {pay}
            </span>
          )}
        </div>

        {/* Skills */}
        {(project.skills?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[11px] px-2 py-0.5 font-normal">
                {skill}
              </Badge>
            ))}
            {project.skills.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-normal cursor-default">
                      +{project.skills.length - 3}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-48">
                    {project.skills.slice(3).join(", ")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-border/40">
          <div className="flex items-center gap-2 flex-wrap">
            {typeInfo && (
              <Badge className={`text-[10px] font-medium px-2 py-0 h-5 border-0 ${typeInfo.color}`}>
                {typeInfo.label}
              </Badge>
            )}
            {project.deadline && (
              <span className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400">
                <Calendar className="h-3 w-3" />
                {project.deadline}
              </span>
            )}
            {!project.deadline && project.applicants > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                {project.applicants} applied
              </span>
            )}
            {!project.deadline && !project.applicants && project.postedAt && (
              <span className="text-[11px] text-muted-foreground">{project.postedAt}</span>
            )}
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
        </div>
      </Card>
    </LocaleLink>
  )
}
