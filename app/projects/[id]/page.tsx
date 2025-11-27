"use client"

import type React from "react"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { sampleProjects } from "@/lib/data"
import {
  Clock,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  Share2,
  Bookmark,
  ArrowLeft,
  Building2,
  FileText,
  Eye,
} from "lucide-react"

export default function ProjectDetailPage() {
  const params = useParams()
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false)
  const [applicationSubmitted, setApplicationSubmitted] = useState(false)

  const project = sampleProjects.find((p) => p.id === params.id) || sampleProjects[0]

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    setApplicationSubmitted(true)
    setTimeout(() => {
      setIsApplyDialogOpen(false)
      setApplicationSubmitted(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <Link
              href="/projects"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge className="bg-blue-100 text-blue-700">{project.projectType}</Badge>
                  <Badge variant="outline">
                    <MapPin className="h-3 w-3 mr-1" />
                    {project.location}
                  </Badge>
                </div>

                <h1 className="text-3xl font-bold text-foreground mb-4">{project.title}</h1>

                <div className="flex items-center gap-4">
                  <img
                    src={project.ngo.logo || "/placeholder.svg"}
                    alt={project.ngo.name}
                    className="w-12 h-12 rounded-lg object-cover bg-muted"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{project.ngo.name}</p>
                      {project.ngo.verified && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">Verified Organization</p>
                  </div>
                </div>
              </div>

              {/* Project Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Project Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-slate max-w-none">
                  <p className="text-foreground leading-relaxed">{project.description}</p>
                  <p className="text-foreground leading-relaxed mt-4">
                    We're looking for a skilled volunteer to help us create a comprehensive social media strategy that
                    will increase our reach and engagement across platforms. This project will involve analyzing our
                    current social media presence, identifying opportunities for improvement, and developing a content
                    calendar and posting strategy.
                  </p>
                  <h4 className="font-semibold text-foreground mt-6 mb-3">What You'll Do:</h4>
                  <ul className="list-disc list-inside text-foreground space-y-2">
                    <li>Audit current social media accounts and performance</li>
                    <li>Research target audience and competitor strategies</li>
                    <li>Develop a 3-month content strategy and calendar</li>
                    <li>Create templates for recurring post types</li>
                    <li>Provide recommendations for tools and best practices</li>
                  </ul>
                  <h4 className="font-semibold text-foreground mt-6 mb-3">Expected Deliverables:</h4>
                  <ul className="list-disc list-inside text-foreground space-y-2">
                    <li>Social media audit report</li>
                    <li>Strategy document with platform recommendations</li>
                    <li>3-month content calendar</li>
                    <li>5-10 post templates</li>
                    <li>Final presentation and handoff meeting</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Skills Required */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {project.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-sm py-1 px-3 bg-accent text-accent-foreground"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* About the Organization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    About {project.ngo.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <img
                      src={project.ngo.logo || "/placeholder.svg"}
                      alt={project.ngo.name}
                      className="w-16 h-16 rounded-xl object-cover bg-muted"
                    />
                    <div>
                      <p className="text-foreground leading-relaxed">
                        {project.ngo.name} is a registered nonprofit organization working to protect biodiversity and
                        promote sustainable practices across Southeast Asia. Founded in 2015, we have implemented over
                        50 conservation projects and engaged more than 10,000 volunteers.
                      </p>
                      <Button variant="link" className="px-0 mt-2 text-primary">
                        View Organization Profile →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Apply Card - Sticky */}
              <Card className="lg:sticky lg:top-24">
                <CardContent className="p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Time Commitment</span>
                      </div>
                      <span className="font-medium text-foreground">{project.timeCommitment}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Deadline</span>
                      </div>
                      <span className="font-medium text-foreground">{project.deadline}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Location</span>
                      </div>
                      <span className="font-medium text-foreground">{project.location}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Applications</span>
                      </div>
                      <span className="font-medium text-foreground">{project.applicants}</span>
                    </div>
                  </div>

                  <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full mb-3 bg-primary hover:bg-primary/90" size="lg">
                        Apply Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg bg-background">
                      <DialogHeader>
                        <DialogTitle>Apply for this Project</DialogTitle>
                        <DialogDescription>
                          Tell the organization why you're interested and how you can help.
                        </DialogDescription>
                      </DialogHeader>

                      {applicationSubmitted ? (
                        <div className="py-8 text-center">
                          <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-success" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">Application Submitted!</h3>
                          <p className="text-muted-foreground">
                            The organization will review your application and get back to you soon.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleApply} className="space-y-4">
                          <div>
                            <Label htmlFor="interest">Why are you interested in this project?</Label>
                            <Textarea
                              id="interest"
                              placeholder="Share what excites you about this opportunity..."
                              className="mt-2"
                              rows={3}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="experience">Relevant experience</Label>
                            <Textarea
                              id="experience"
                              placeholder="Describe your relevant skills and past projects..."
                              className="mt-2"
                              rows={3}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="portfolio">Portfolio or LinkedIn URL (optional)</Label>
                            <Input id="portfolio" type="url" placeholder="https://" className="mt-2" />
                          </div>
                          <div>
                            <Label htmlFor="availability">Your availability</Label>
                            <Input
                              id="availability"
                              placeholder="e.g., Weekday evenings, 10 hours/week"
                              className="mt-2"
                              required
                            />
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" className="bg-primary hover:bg-primary/90">
                              Submit Application
                            </Button>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>248 people viewed this project</span>
                  </div>
                </CardContent>
              </Card>

              {/* Similar Projects */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Similar Projects</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sampleProjects.slice(1, 4).map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium text-foreground text-sm mb-1 line-clamp-2">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.ngo.name}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
