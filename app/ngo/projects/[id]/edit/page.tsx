"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { getNGOProfile, getProjectById, updateProject } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import type { NGOProfile, Project } from "@/lib/types"
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default function EditProjectPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [ngoProfile, setNgoProfile] = useState<NGOProfile | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skills: [] as { categoryId: string; subskillId: string; priority: string }[],
    selectedSkillNames: [] as string[],
    timeCommitment: "",
    duration: "2-4 weeks",
    deadline: "",
    workMode: "remote" as "remote" | "onsite" | "hybrid",
    location: "",
    projectType: "short-term" as "short-term" | "long-term" | "consultation" | "ongoing",
    experienceLevel: "intermediate" as "beginner" | "intermediate" | "expert",
    causes: [] as string[],
    status: "active" as "draft" | "active" | "open" | "paused" | "completed" | "closed" | "cancelled",
  })

  // Fetch project and NGO profile on mount
  useEffect(() => {
    async function loadData() {
      if (!user) return
      setIsLoading(true)
      
      try {
        const [profileResult, projectResult] = await Promise.all([
          getNGOProfile(),
          getProjectById(id),
        ])

        if (profileResult) {
          setNgoProfile(profileResult)
        }

        if (projectResult) {
          setProject(projectResult)
          
          // Map skills to names
          const skillNames: string[] = []
          projectResult.skillsRequired?.forEach((skill: any) => {
            const category = skillCategories.find((c) => c.id === skill.categoryId)
            const subskill = category?.subskills.find((s) => s.id === skill.subskillId)
            if (subskill) {
              skillNames.push(subskill.name)
            }
          })

          setFormData({
            title: projectResult.title || "",
            description: projectResult.description || "",
            skills: projectResult.skillsRequired || [],
            selectedSkillNames: skillNames,
            timeCommitment: projectResult.timeCommitment || "",
            duration: projectResult.duration || "2-4 weeks",
            deadline: projectResult.deadline
              ? new Date(projectResult.deadline).toISOString().split("T")[0]
              : "",
            workMode: projectResult.workMode || "remote",
            location: projectResult.location || "",
            projectType: projectResult.projectType || "short-term",
            experienceLevel: projectResult.experienceLevel || "intermediate",
            causes: projectResult.causes || [],
            status: projectResult.status || "active",
          })
        }
      } catch (err) {
        setError("Failed to load project")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user, id])

  const toggleSkill = (skillName: string, categoryId: string, subskillId: string) => {
    setFormData((prev) => {
      const exists = prev.selectedSkillNames.includes(skillName)
      if (exists) {
        return {
          ...prev,
          selectedSkillNames: prev.selectedSkillNames.filter((s) => s !== skillName),
          skills: prev.skills.filter((s) => !(s.categoryId === categoryId && s.subskillId === subskillId)),
        }
      } else {
        return {
          ...prev,
          selectedSkillNames: [...prev.selectedSkillNames, skillName],
          skills: [...prev.skills, { categoryId, subskillId, priority: "must-have" }],
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      const result = await updateProject(id, {
        title: formData.title,
        description: formData.description,
        skillsRequired: formData.skills.map((s) => ({
          categoryId: s.categoryId,
          subskillId: s.subskillId,
          priority: s.priority as "must-have" | "nice-to-have",
        })),
        experienceLevel: formData.experienceLevel,
        timeCommitment: formData.timeCommitment,
        duration: formData.duration,
        projectType: formData.projectType,
        workMode: formData.workMode,
        location: formData.location || undefined,
        causes: formData.causes,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        status: formData.status,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/ngo/projects")
        }, 1500)
      } else {
        setError(result.error || "Failed to update project")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to edit it.
          </p>
          <Button asChild>
            <Link href="/ngo/projects">Go to Projects</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        userType="ngo" 
        userName={ngoProfile?.organizationName || user?.name || "NGO"}
        userAvatar={ngoProfile?.logo || user?.image || undefined}
      />

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/ngo/projects"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Edit Project</h1>
          <p className="text-muted-foreground">Update your project details</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Make changes to your project and save when done</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Project Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Social Media Strategy for Environmental Campaign"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you need help with, the background, and any specific requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  required
                />
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label>Skills Required</Label>
                <div className="space-y-4">
                  {skillCategories.slice(0, 4).map((category) => (
                    <div key={category.id}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">{category.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {category.subskills.slice(0, 8).map((subskill) => (
                          <Badge
                            key={subskill.id}
                            variant={formData.selectedSkillNames.includes(subskill.name) ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${
                              formData.selectedSkillNames.includes(subskill.name)
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-primary/10 hover:border-primary"
                            }`}
                            onClick={() => toggleSkill(subskill.name, category.id, subskill.id)}
                          >
                            {subskill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level Required</Label>
                <Select
                  value={formData.experienceLevel}
                  onValueChange={(value: "beginner" | "intermediate" | "expert") =>
                    setFormData({ ...formData, experienceLevel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time & Duration */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time">Time Commitment</Label>
                  <Select
                    value={formData.timeCommitment}
                    onValueChange={(value) => setFormData({ ...formData, timeCommitment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select estimated hours" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2 hours">1-2 hours (Consultation)</SelectItem>
                      <SelectItem value="5-10 hours">5-10 hours</SelectItem>
                      <SelectItem value="10-15 hours">10-15 hours</SelectItem>
                      <SelectItem value="15-25 hours">15-25 hours</SelectItem>
                      <SelectItem value="25-40 hours">25-40 hours</SelectItem>
                      <SelectItem value="40+ hours">40+ hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 week">1 week</SelectItem>
                      <SelectItem value="2-4 weeks">2-4 weeks</SelectItem>
                      <SelectItem value="1-2 months">1-2 months</SelectItem>
                      <SelectItem value="3-6 months">3-6 months</SelectItem>
                      <SelectItem value="6+ months">6+ months</SelectItem>
                      <SelectItem value="Ongoing">Ongoing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label htmlFor="deadline">Application Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              {/* Work Mode */}
              <div className="space-y-2">
                <Label htmlFor="workMode">Work Mode</Label>
                <Select
                  value={formData.workMode}
                  onValueChange={(value: "remote" | "onsite" | "hybrid") => 
                    setFormData({ ...formData, workMode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.workMode !== "remote" && (
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Mumbai, India"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              )}

              {/* Project Type */}
              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type</Label>
                <Select
                  value={formData.projectType}
                  onValueChange={(value: "short-term" | "long-term" | "consultation" | "ongoing") =>
                    setFormData({ ...formData, projectType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short-term">Short-term</SelectItem>
                    <SelectItem value="long-term">Long-term</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Messages */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Project updated successfully! Redirecting...
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  asChild
                >
                  <Link href={`/ngo/projects/${id}/delete`}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </Link>
                </Button>
                
                <div className="flex gap-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/ngo/projects">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
