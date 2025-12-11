import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Users, CheckCircle } from "lucide-react"

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
}

export function ProjectCard({ project }: { project: Project }) {
  const projectTypeColors: { [key: string]: string } = {
    consultation: "bg-purple-100 text-purple-700",
    "short-term": "bg-blue-100 text-blue-700",
    "long-term": "bg-green-100 text-green-700",
  }

  return (
    <div className="group flex flex-col h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
      {/* NGO Info */}
      <div className="flex items-center gap-3 mb-4">
        <img
          src={project.ngo.logo || "/placeholder.svg"}
          alt={project.ngo.name}
          className="w-10 h-10 rounded-lg object-cover bg-muted"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">{project.ngo.name}</p>
            {project.ngo.verified && <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />}
          </div>
        </div>
      </div>

      {/* Project Title & Description */}
      <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {project.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">{project.description}</p>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.skills.slice(0, 3).map((skill) => (
          <Badge key={skill} variant="secondary" className="text-xs bg-accent text-accent-foreground">
            {skill}
          </Badge>
        ))}
        {project.skills.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{project.skills.length - 3}
          </Badge>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{project.timeCommitment}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>{project.location}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${projectTypeColors[project.projectType] || "bg-gray-100 text-gray-700"}`}>
            {project.projectType === "consultation" ? "1-hour call" : project.projectType}
          </Badge>
          <span className="text-xs text-muted-foreground">
            <Users className="h-3 w-3 inline mr-1" />
            {project.applicants} applied
          </span>
        </div>
        <Button asChild size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
          <Link href={`/projects/${project.id}`}>Apply →</Link>
        </Button>
      </div>
    </div>
  )
}
