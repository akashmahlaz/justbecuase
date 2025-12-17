"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { getNGOProfile, createProject } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import type { NGOProfile } from "@/lib/types"
import {
  ArrowLeft,
  ArrowRight,
  Megaphone,
  Code,
  Palette,
  FileText,
  DollarSign,
  Scale,
  PenTool,
  Calendar,
  Users,
  Briefcase,
  Phone,
  Presentation,
  CheckCircle,
  Loader2,
  Upload,
} from "lucide-react"

const projectTemplates = [
  { id: "social-media", name: "Social Media Strategy", icon: Megaphone, time: "10-15 hours" },
  { id: "website", name: "Website Design/Development", icon: Code, time: "25-40 hours" },
  { id: "branding", name: "Branding & Logo Design", icon: Palette, time: "15-25 hours" },
  { id: "grant-writing", name: "Grant Writing Support", icon: FileText, time: "15-20 hours" },
  { id: "financial", name: "Financial Planning", icon: DollarSign, time: "10-15 hours" },
  { id: "legal", name: "Legal Document Review", icon: Scale, time: "5-10 hours" },
  { id: "content", name: "Content Creation", icon: PenTool, time: "10-20 hours" },
  { id: "fundraising", name: "Fundraising Strategy", icon: Calendar, time: "15-25 hours" },
  { id: "hr", name: "HR & Training Support", icon: Users, time: "10-15 hours" },
  { id: "strategy", name: "Strategic Planning", icon: Briefcase, time: "20-30 hours" },
  { id: "consultation", name: "One-Hour Consultation", icon: Phone, time: "1-2 hours" },
  { id: "presentation", name: "Pitch Deck Creation", icon: Presentation, time: "10-15 hours" },
]

const skillOptions = skillCategories.flatMap(cat => 
  cat.subskills.map(sub => ({ name: sub.name, categoryId: cat.id, subskillId: sub.id }))
)

export default function PostProjectPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [ngoProfile, setNgoProfile] = useState<NGOProfile | null>(null)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [documents, setDocuments] = useState<Array<{ name: string; url: string; type: string }>>([])
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
    deliverables: "",
  })

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploadingDoc(true)
    
    try {
      for (const file of Array.from(files)) {
        // Get signature from server
        const signatureRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'project-documents' }),
        })
        
        if (!signatureRes.ok) {
          throw new Error('Failed to get upload signature')
        }
        
        const { signature, timestamp, cloudName, apiKey, folder } = await signatureRes.json()
        
        // Upload to Cloudinary
        const formData = new FormData()
        formData.append('file', file)
        formData.append('signature', signature)
        formData.append('timestamp', timestamp.toString())
        formData.append('api_key', apiKey)
        formData.append('folder', folder)
        
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: formData,
        })
        
        if (!uploadRes.ok) {
          throw new Error('Failed to upload file')
        }
        
        const uploadData = await uploadRes.json()
        
        setDocuments(prev => [...prev, {
          name: file.name,
          url: uploadData.secure_url,
          type: file.type,
        }])
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload document')
    } finally {
      setUploadingDoc(false)
    }
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  // Fetch NGO profile on mount
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const profile = await getNGOProfile()
      if (profile) {
        setNgoProfile(profile)
        // Pre-fill causes from NGO profile
        if (profile.causes) {
          setFormData(prev => ({ ...prev, causes: profile.causes || [] }))
        }
      }
    }
    loadProfile()
  }, [user])

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

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = projectTemplates.find((t) => t.id === templateId)
    if (template) {
      setFormData((prev) => ({
        ...prev,
        title: template.name,
        timeCommitment: template.time,
        projectType: templateId === "consultation" ? "consultation" : "short-term",
      }))
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await createProject({
        title: formData.title,
        description: formData.description + (formData.deliverables ? `\n\nDeliverables:\n${formData.deliverables}` : ""),
        skillsRequired: formData.skills,
        experienceLevel: formData.experienceLevel,
        timeCommitment: formData.timeCommitment,
        duration: formData.duration,
        projectType: formData.projectType,
        workMode: formData.workMode,
        location: formData.location || undefined,
        causes: formData.causes,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        documents: documents,
      })

      if (result.success) {
        router.push("/ngo/projects")
      } else {
        setError(result.error || "Failed to create project")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const progressPercent = (step / 3) * 100

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        userType="ngo" 
        userName={ngoProfile?.orgName || user?.name || "NGO"}
      />

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/ngo/dashboard"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <span className="text-sm text-muted-foreground">Step {step} of 3</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step 1: Choose Template */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Post a New Project</h1>
              <p className="text-muted-foreground">Choose a project type to get started quickly</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className="group p-6 rounded-xl border-2 border-border hover:border-primary hover:shadow-md transition-all text-left bg-card"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <template.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">Est. {template.time}</p>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate(null)
                  setStep(2)
                }}
                className="bg-transparent"
              >
                Or create a custom project
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Project Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>Project Details</CardTitle>
                  <CardDescription>Provide information about your project</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setStep(3)
                }}
                className="space-y-6"
              >
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

                <div className="space-y-2">
                  <Label>Skills Required</Label>
                  <div className="space-y-4">
                    {skillCategories.slice(0, 4).map((category) => (
                      <div key={category.id}>
                        <p className="text-sm font-medium text-muted-foreground mb-2">{category.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {category.subskills.slice(0, 6).map((subskill) => (
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
                    <Label htmlFor="deadline">Application Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workMode">Work Mode</Label>
                  <Select
                    value={formData.workMode}
                    onValueChange={(value: "remote" | "onsite" | "hybrid") => setFormData({ ...formData, workMode: value })}
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

                <div className="space-y-2">
                  <Label htmlFor="deliverables">Expected Deliverables</Label>
                  <Textarea
                    id="deliverables"
                    placeholder="List the specific outputs you expect from this project..."
                    value={formData.deliverables}
                    onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="files">Supporting Documents (optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      id="files"
                      multiple
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleDocumentUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingDoc}
                    />
                    {uploadingDoc ? (
                      <>
                        <Loader2 className="h-8 w-8 mx-auto mb-2 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, or images up to 10MB</p>
                      </>
                    )}
                  </div>
                  
                  {/* Uploaded documents list */}
                  {documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="bg-transparent">
                    Back
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    Review Project
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>Review Your Project</CardTitle>
                  <CardDescription>Make sure everything looks good before posting</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 rounded-xl border border-border bg-muted/30">
                  <h3 className="text-xl font-semibold text-foreground mb-4">{formData.title || "Untitled Project"}</h3>

                  <div className="grid gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-foreground">{formData.description || "No description provided"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Skills Required</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.selectedSkillNames.length > 0 ? (
                          formData.selectedSkillNames.map((skill) => (
                            <Badge key={skill} className="bg-accent text-accent-foreground">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">No skills selected</span>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Time Commitment</p>
                        <p className="text-foreground">{formData.timeCommitment || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Deadline</p>
                        <p className="text-foreground">{formData.deadline || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Work Mode</p>
                        <p className="text-foreground capitalize">{formData.workMode}</p>
                      </div>
                    </div>

                    {formData.deliverables && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Deliverables</p>
                        <p className="text-foreground">{formData.deliverables}</p>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="bg-transparent">
                    Edit Project
                  </Button>
                  <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Post Project
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
