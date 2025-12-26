"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Eye, MoreHorizontal, MapPin, Users, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface Project {
  _id?: any
  id?: string
  title: string
  description?: string
  projectType: string
  workMode: string
  status: string
  applicantsCount?: number
  createdAt?: string | Date
  ngoName?: string
  skills?: string[]
  location?: string
}

interface ProjectsSearchableListProps {
  projects: Project[]
  title: string
}

export function ProjectsSearchableList({ projects, title }: ProjectsSearchableListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "paused" | "cancelled">("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Get unique project types
  const projectTypes = useMemo(() => {
    const types = new Set(projects.map(p => p.projectType).filter(Boolean))
    return Array.from(types)
  }, [projects])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        project.title.toLowerCase().includes(searchLower) ||
        (project.description && project.description.toLowerCase().includes(searchLower)) ||
        (project.ngoName && project.ngoName.toLowerCase().includes(searchLower)) ||
        (project.location && project.location.toLowerCase().includes(searchLower)) ||
        (project.skills && project.skills.some(s => s.toLowerCase().includes(searchLower)))

      // Status filter
      const matchesStatus = statusFilter === "all" || project.status === statusFilter

      // Type filter
      const matchesType = typeFilter === "all" || project.projectType === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [projects, searchQuery, statusFilter, typeFilter])

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    paused: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-700",
  }

  const handleExport = () => {
    // Export to CSV
    const headers = ["Title", "Type", "Work Mode", "Status", "Applications", "Created"]
    const rows = filteredProjects.map(project => [
      project.title,
      project.projectType,
      project.workMode,
      project.status,
      project.applicantsCount?.toString() || "0",
      project.createdAt ? new Date(project.createdAt instanceof Date ? project.createdAt : project.createdAt).toLocaleDateString() : ""
    ])
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `projects-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by title, NGO, skills, or location..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select 
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select 
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {projectTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{title} ({filteredProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Project</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Work Mode</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Applications</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const projectId = project._id?.toString() || project.id
                    return (
                      <tr key={projectId} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-foreground">{project.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {project.description?.slice(0, 50)}...
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{project.projectType}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {project.workMode}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {project.applicantsCount || 0}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={statusColors[project.status] || "bg-gray-100"}>
                            {project.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${projectId}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Project
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No projects found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
