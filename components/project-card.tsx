"use client"

import LocaleLink from "@/components/locale-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Users, CheckCircle, ArrowRight, Star, Calendar, DollarSign, Globe, GraduationCap } from "lucide-react"
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
  const projectTypeColors: { [key: string]: string } = {
    consultation: "bg-purple-100 text-purple-700",
    "short-term": "bg-blue-100 text-blue-700",
    "long-term": "bg-green-100 text-green-700",
  }

  return (
    <Card className="group flex flex-col h-full hover:border-primary/30 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        {/* Match Score Badge */}
        {project.matchScore != null && project.matchScore > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 flex-1">
                    <Badge className={`text-xs font-semibold ${
                      project.matchScore >= 75 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      project.matchScore >= 50 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    }`}>
                      <Star className="h-3 w-3 mr-1" />
                      {Math.round(project.matchScore)}% Match
                    </Badge>
                    <Progress
                      value={project.matchScore}
                      className="h-1.5 flex-1 max-w-20"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {project.matchReasons && project.matchReasons.length > 0
                    ? project.matchReasons.join(", ")
                    : `${Math.round(project.matchScore)}% match based on your skills`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* NGO Info with HoverCard */}
        <div className="flex items-center gap-3">
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Avatar className="size-10 rounded-lg">
                  <AvatarImage src={project.ngo?.logo || ""} alt={project.ngo?.name || "Organization"} />
                  <AvatarFallback className="rounded-lg text-xs font-medium">
                    {(project.ngo?.name || "O").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{project.ngo?.name || (t.unknown || "Unknown")}</p>
                    {project.ngo?.verified && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                </div>
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-64" align="start">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 rounded-lg">
                  <AvatarImage src={project.ngo?.logo || ""} alt={project.ngo?.name || "Organization"} />
                  <AvatarFallback className="rounded-lg">
                    {(project.ngo?.name || "O").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{project.ngo?.name}</p>
                  {project.ngo?.verified && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        {/* Project Title & Description */}
        <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {project.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 grow">{project.description}</p>

        {/* Dynamic badges row — work mode, experience, salary */}
        <div className="flex flex-wrap gap-1.5">
          {project.workMode && (
            <Badge variant="outline" className="text-xs capitalize">
              <Globe className="h-3 w-3 mr-1" />
              {project.workMode}
            </Badge>
          )}
          {project.experienceLevel && (
            <Badge variant="outline" className="text-xs capitalize">
              <GraduationCap className="h-3 w-3 mr-1" />
              {project.experienceLevel}
            </Badge>
          )}
          {project.salary && (
            <Badge variant="outline" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              {project.salary.length > 25 ? project.salary.slice(0, 25) + "…" : project.salary}
            </Badge>
          )}
          {project.compensationType && !project.salary && (
            <Badge variant="outline" className="text-xs capitalize">
              <DollarSign className="h-3 w-3 mr-1" />
              {project.compensationType}
            </Badge>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {(project.skills || []).slice(0, 3).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {(project.skills || []).length > 3 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs cursor-default">
                    +{project.skills.length - 3}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {project.skills.slice(3).join(", ")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          {project.timeCommitment && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{project.timeCommitment}</span>
            </div>
          )}
          {project.duration && !project.timeCommitment && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{project.duration}</span>
            </div>
          )}
          {project.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{project.location}</span>
            </div>
          )}
          {project.deadline && (
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>{project.deadline}</span>
            </div>
          )}
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${projectTypeColors[project.projectType] || "bg-gray-100 text-gray-700"}`}>
            {project.projectType === "consultation" ? (t.oneHourCall || "1-hour call") : project.projectType}
          </Badge>

          {project.applicants > 0 ? (
            <span className="text-xs text-muted-foreground">
              <Users className="h-3 w-3 inline mr-1" />
              {project.applicants} {t.applied || "applied"}
            </span>
          ) : project.postedAt ? (
            <span className="text-xs text-muted-foreground">{project.postedAt}</span>
          ) : null}
        </div>
        <Button asChild size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
          <LocaleLink href={project._source === "external" ? `/projects/ext/${project.id.replace("ext-", "")}` : `/projects/${project.id}`}>
            {t.apply || "Apply"} <ArrowRight className="h-3 w-3 inline ml-1" />
          </LocaleLink>
        </Button>
      </CardFooter>
    </Card>
  )
}
