import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getNGOById, getActiveProjects } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import { 
  MapPin, 
  CheckCircle, 
  Users, 
  FolderKanban, 
  ExternalLink, 
  Globe, 
  Heart, 
  Building2,
  Calendar,
  Mail,
  Phone
} from "lucide-react"

// Helper to get skill name
function getSkillName(categoryId: string, subskillId: string): string {
  const category = skillCategories.find((c) => c.id === categoryId)
  if (!category) return subskillId
  const subskill = category.subskills.find((s) => s.id === subskillId)
  return subskill?.name || subskillId
}

export default async function NGOProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Get NGO profile from database
  const ngo = await getNGOById(id)
  
  if (!ngo) {
    notFound()
  }
  
  // Get NGO's projects
  const allProjects = await getActiveProjects(20)
  const ngoProjects = allProjects.filter(p => p.ngoId === id)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-linear-to-r from-secondary/10 to-primary/10 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-32 h-32 rounded-2xl border-4 border-background shadow-xl bg-muted flex items-center justify-center overflow-hidden">
                {ngo.logo ? (
                  <img
                    src={ngo.logo}
                    alt={ngo.orgName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">{ngo.orgName}</h1>
                  {ngo.isVerified && <CheckCircle className="h-6 w-6 text-primary" />}
                </div>
                {ngo.description && (
                  <p className="text-lg text-muted-foreground mb-4 line-clamp-2">{ngo.description}</p>
                )}

                <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mb-4">
                  {(ngo.city || ngo.country) && (
                    <div className="flex items-center gap-1 text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {[ngo.city, ngo.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-foreground">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    {ngo.projectsPosted} projects posted
                  </div>
                  <div className="flex items-center gap-1 text-foreground">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {ngo.volunteersEngaged} volunteers engaged
                  </div>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {ngo.causes?.map((cause, index) => (
                    <Badge key={index} className="bg-secondary/10 text-secondary border-0">
                      {cause}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="bg-primary hover:bg-primary/90">
                  <Heart className="h-4 w-4 mr-2" />
                  Follow Organization
                </Button>
                {ngo.website && (
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href={ngo.website} target="_blank">
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle>About {ngo.orgName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {ngo.description || `${ngo.orgName} is a registered nonprofit organization working to create positive change in communities.`}
                  </p>
                  {ngo.mission && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Mission</p>
                      <p className="text-foreground">{ngo.mission}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Open Projects */}
              {ngoProjects.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">Open Projects ({ngoProjects.length})</h2>
                    <Button asChild variant="outline" className="bg-transparent">
                      <Link href={`/projects?ngo=${id}`}>View All</Link>
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {ngoProjects.slice(0, 4).map((project) => (
                      <Link
                        key={project._id?.toString()}
                        href={`/projects/${project._id?.toString()}`}
                        className="block"
                      >
                        <Card className="h-full hover:border-primary/50 transition-colors">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge className="capitalize text-xs">{project.projectType}</Badge>
                              <Badge variant="outline" className="capitalize text-xs">{project.workMode}</Badge>
                            </div>
                            <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{project.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                              {project.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {project.skillsRequired.slice(0, 3).map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {getSkillName(skill.categoryId, skill.subskillId)}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                              <span>{project.timeCommitment}</span>
                              <span>{project.applicantsCount} applicants</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No Open Projects</h3>
                    <p className="text-muted-foreground">
                      This organization doesn&apos;t have any open projects at the moment.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Skills They Need */}
              {ngo.typicalSkillsNeeded && ngo.typicalSkillsNeeded.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Skills They&apos;re Looking For</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {ngo.typicalSkillsNeeded.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="py-1 px-3">
                          {getSkillName(skill.categoryId, skill.subskillId)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Impact Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 rounded-lg bg-primary/10">
                    <p className="text-3xl font-bold text-primary">{ngo.projectsPosted}</p>
                    <p className="text-sm text-muted-foreground">Projects Posted</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold text-foreground">{ngo.volunteersEngaged}</p>
                      <p className="text-xs text-muted-foreground">Volunteers</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold text-foreground">
                        ₹{((ngo.volunteersEngaged || 0) * 50000).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Value Created</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Organization Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ngo.registrationNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Registration</span>
                      <span className="text-sm font-medium text-foreground">{ngo.registrationNumber}</span>
                    </div>
                  )}
                  {ngo.teamSize && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Team Size</span>
                      <span className="text-sm font-medium text-foreground capitalize">{ngo.teamSize}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={ngo.isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                      {ngo.isVerified ? "Verified" : "Pending Verification"}
                    </Badge>
                  </div>
                  {ngo.createdAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Member Since</span>
                      <span className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ngo.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Connect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ngo.website && (
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href={ngo.website} target="_blank">
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Link>
                    </Button>
                  )}
                  {ngo.contactEmail && (
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href={`mailto:${ngo.contactEmail}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Link>
                    </Button>
                  )}
                  {ngo.contactPhone && (
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href={`tel:${ngo.contactPhone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Phone
                      </Link>
                    </Button>
                  )}
                  {ngo.socialLinks?.linkedin && (
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href={ngo.socialLinks.linkedin} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        LinkedIn
                      </Link>
                    </Button>
                  )}
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
