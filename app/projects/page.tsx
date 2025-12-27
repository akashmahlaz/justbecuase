"use client"

import { useState, useEffect, useMemo } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProjectCard } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { skillCategories } from "@/lib/skills-data"
import { Search, SlidersHorizontal, Grid3X3, List, X, Loader2 } from "lucide-react"

interface Project {
  _id?: { toString: () => string }
  id?: string
  title: string
  description: string
  skillsRequired: { categoryId: string; subskillId: string }[]
  ngoId: string
  status: string
  workMode: string
  location?: string
  timeCommitment: string
  deadline?: Date
  projectType: string
  applicantsCount: number
  createdAt: Date
  ngo?: {
    name: string
    logo?: string
    verified?: boolean
  }
  skills?: string[]
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedTimeCommitment, setSelectedTimeCommitment] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects")
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const timeCommitments = ["1-5 hours/week", "5-10 hours/week", "10-20 hours/week", "20+ hours/week"]
  const locations = ["Remote", "On-site", "Hybrid"]

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  const toggleTimeCommitment = (time: string) => {
    setSelectedTimeCommitment((prev) => (prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]))
  }

  const clearFilters = () => {
    setSelectedSkills([])
    setSelectedTimeCommitment([])
    setSelectedLocation("")
    setSearchQuery("")
  }

  const hasActiveFilters = selectedSkills.length > 0 || selectedTimeCommitment.length > 0 || selectedLocation !== ""

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects]
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((project) => {
        const titleMatch = project.title?.toLowerCase().includes(query)
        const descMatch = project.description?.toLowerCase().includes(query)
        const skillsMatch = project.skillsRequired?.some(s => 
          s.categoryId?.toLowerCase().includes(query) || 
          s.subskillId?.toLowerCase().includes(query)
        )
        const ngoMatch = project.ngo?.name?.toLowerCase().includes(query)
        return titleMatch || descMatch || skillsMatch || ngoMatch
      })
    }
    
    // Skills filter (by category)
    if (selectedSkills.length > 0) {
      result = result.filter((project) => {
        const projectCategories = project.skillsRequired?.map(s => s.categoryId) || []
        return selectedSkills.some(skill => {
          const category = skillCategories.find(c => c.name === skill)
          return projectCategories.includes(category?.id || skill.toLowerCase().replace(/\s+/g, '-'))
        })
      })
    }
    
    // Time commitment filter
    if (selectedTimeCommitment.length > 0) {
      result = result.filter((project) => {
        return selectedTimeCommitment.some(time => {
          const projectTime = project.timeCommitment?.toLowerCase() || ""
          const filterTime = time.toLowerCase()
          // Match similar time ranges
          if (filterTime.includes("1-5") && (projectTime.includes("1-5") || projectTime.includes("few hours"))) return true
          if (filterTime.includes("5-10") && projectTime.includes("5-10")) return true
          if (filterTime.includes("10-20") && projectTime.includes("10-20")) return true
          if (filterTime.includes("20+") && (projectTime.includes("20+") || projectTime.includes("full-time"))) return true
          return projectTime.includes(filterTime)
        })
      })
    }
    
    // Location/Work mode filter
    if (selectedLocation && selectedLocation !== "all") {
      result = result.filter((project) => {
        const workMode = project.workMode?.toLowerCase() || ""
        const location = project.location?.toLowerCase() || ""
        const filterLocation = selectedLocation.toLowerCase()
        return workMode === filterLocation || location.includes(filterLocation)
      })
    }
    
    // Sorting
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "closing":
        result.sort((a, b) => {
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })
        break
      case "popular":
        result.sort((a, b) => (b.applicantsCount || 0) - (a.applicantsCount || 0))
        break
      case "relevant":
      default:
        // Keep original order for relevance (could be enhanced with matching algorithm)
        break
    }
    
    return result
  }, [projects, searchQuery, selectedSkills, selectedTimeCommitment, selectedLocation, sortBy])

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Skills */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">Skills</Label>
        <div className="space-y-2">
          {skillCategories.map((category) => (
            <div key={category.name} className="flex items-center space-x-2">
              <Checkbox
                id={category.name}
                checked={selectedSkills.includes(category.name)}
                onCheckedChange={() => toggleSkill(category.name)}
              />
              <label
                htmlFor={category.name}
                className="text-sm text-foreground cursor-pointer flex-1 flex items-center justify-between"
              >
                <span>{category.name}</span>
                <span className="text-muted-foreground text-xs">({category.subskills.length} skills)</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Time Commitment */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">Time Commitment</Label>
        <div className="space-y-2">
          {timeCommitments.map((time) => (
            <div key={time} className="flex items-center space-x-2">
              <Checkbox
                id={time}
                checked={selectedTimeCommitment.includes(time)}
                onCheckedChange={() => toggleTimeCommitment(time)}
              />
              <label htmlFor={time} className="text-sm text-foreground cursor-pointer">
                {time}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">Location</Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger>
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full bg-transparent" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear all filters
        </Button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 py-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Browse Projects</h1>
            <p className="text-muted-foreground">Find opportunities that match your skills and interests</p>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          {/* Search and Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, skills, or organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden bg-transparent">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-primary text-primary-foreground">
                        {selectedSkills.length + selectedTimeCommitment.length + (selectedLocation ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 bg-background">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="relevant">Most Relevant</SelectItem>
                  <SelectItem value="closing">Closing Soon</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>

              <div className="hidden sm:flex items-center border border-border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <button onClick={() => toggleSkill(skill)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedTimeCommitment.map((time) => (
                <Badge key={time} variant="secondary" className="flex items-center gap-1">
                  {time}
                  <button onClick={() => toggleTimeCommitment(time)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedLocation && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedLocation}
                  <button onClick={() => setSelectedLocation("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-4">Filters</h3>
                <FilterContent />
              </div>
            </aside>

            {/* Projects Grid/List */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{filteredProjects.length}</span> of {projects.length} projects
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No projects found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasActiveFilters ? "Try adjusting your filters" : "Check back later for new opportunities"}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project._id?.toString() || project.id} project={{
                      id: project._id?.toString() || project.id || "",
                      title: project.title,
                      description: project.description,
                      skills: project.skills || project.skillsRequired?.map(s => s.subskillId) || [],
                      location: project.workMode === "remote" ? "Remote" : project.location || "On-site",
                      timeCommitment: project.timeCommitment,
                      applicants: project.applicantsCount || 0,
                      postedAt: project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Recently",
                      projectType: project.projectType,
                      ngo: project.ngo || { name: "NGO", verified: false }
                    }} />
                  ))}
                </div>
              )}

              {/* Load More */}
              {projects.length > 0 && (
                <div className="mt-12 text-center">
                  <Button variant="outline" size="lg">
                    Load More Projects
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
