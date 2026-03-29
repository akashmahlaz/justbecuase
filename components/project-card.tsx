"use client"

import LocaleLink from "@/components/locale-link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, ArrowUpRight, Star, MapPin, Clock, DollarSign, Calendar } from "lucide-react"
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

export function ProjectCard({ project }: { project: Project }) {
  const dict = useDictionary()
  const t = (dict as any).common || {}

  const href = project._source === "external"
    ? `/projects/ext/${project.id.replace("ext-", "")}`
    : `/projects/${project.id}`

  // Build meta items — only show meaningful ones
  const location = project.workMode || project.location
  const time = project.timeCommitment || project.duration
  const pay = project.salary
    ? (project.salary.length > 20 ? project.salary.slice(0, 20) + "…" : project.salary)
    : project.compensationType || null

  return (
    <LocaleLink href={href} className="block group">
      <Card className="h-full p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col gap-3">
        {/* Row 1: Org + Match score */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="size-7 rounded-md shrink-0">
              <AvatarImage src={project.ngo?.logo || ""} alt={project.ngo?.name || ""} />
              <AvatarFallback className="rounded-md text-[10px] font-medium">
                {(project.ngo?.name || "O").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {project.ngo?.name || "Organization"}
            </span>
            {project.ngo?.verified && <CheckCircle className="h-3 w-3 text-primary shrink-0" />}
          </div>
          {project.matchScore != null && project.matchScore > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={`text-[10px] shrink-0 font-medium gap-0.5 ${
                    project.matchScore >= 75 ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" :
                    project.matchScore >= 50 ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400" :
                    "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400"
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
        </div>

        {/* Row 2: Title */}
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {project.title}
        </h3>

        {/* Row 3: Meta chips */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {location && (
            <span className="flex items-center gap-1 capitalize">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {time}
            </span>
          )}
          {pay && (
            <span className="flex items-center gap-1 capitalize">
              <DollarSign className="h-3 w-3" />
              {pay}
            </span>
          )}
        </div>

        {/* Row 4: Skills (compact) */}
        {(project.skills?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.skills.slice(0, 2).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                {skill}
              </Badge>
            ))}
            {project.skills.length > 2 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal cursor-default">
                      +{project.skills.length - 2}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {project.skills.slice(2).join(", ")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Row 5: Footer — deadline/posted + arrow */}
        <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">
            {project.deadline ? (
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Calendar className="h-3 w-3" />
                {project.deadline}
              </span>
            ) : project.postedAt ? (
              project.postedAt
            ) : (
              project.applicants > 0 ? `${project.applicants} applied` : null
            )}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </Card>
    </LocaleLink>
  )
}
