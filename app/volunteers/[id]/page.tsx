import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getVolunteerProfileView } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import { Star, MapPin, Clock, CheckCircle, ExternalLink, Award, TrendingUp, Lock, User } from "lucide-react"
import { UnlockProfileButton } from "@/components/payments/unlock-profile-button"

// Helper function to get skill name from ID
function getSkillName(categoryId: string, subskillId: string): string {
  const category = skillCategories.find((c) => c.id === categoryId)
  if (!category) return subskillId
  const subskill = category.subskills.find((s) => s.id === subskillId)
  return subskill?.name || subskillId
}

export default async function VolunteerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Get volunteer profile with visibility rules applied
  const volunteer = await getVolunteerProfileView(id)

  if (!volunteer) {
    notFound()
  }

  const isLocked = !volunteer.isUnlocked

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar - blurred if locked */}
              <div className="relative">
                {volunteer.avatar && !isLocked ? (
                  <img
                    src={volunteer.avatar}
                    alt={volunteer.name || "Volunteer"}
                    className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-xl">
                    {isLocked ? (
                      <Lock className="h-12 w-12 text-muted-foreground" />
                    ) : (
                      <User className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left">
                {/* Name - hidden if locked */}
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {isLocked ? (
                    <span className="flex items-center gap-2 justify-center md:justify-start">
                      <Lock className="h-5 w-5" />
                      Profile Locked
                    </span>
                  ) : (
                    volunteer.name || "Volunteer"
                  )}
                </h1>
                
                {/* Bio as headline if available */}
                {volunteer.bio && !isLocked && (
                  <p className="text-lg text-muted-foreground mb-4">
                    {volunteer.bio.split("\n")[0]}
                  </p>
                )}

                <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {volunteer.location || "Location not specified"}
                  </div>
                  <div className="flex items-center gap-1 text-foreground">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {volunteer.rating.toFixed(1)} rating
                  </div>
                  <div className="flex items-center gap-1 text-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    {volunteer.completedProjects} projects completed
                  </div>
                  {volunteer.volunteerType === "paid" && (
                    <Badge variant="secondary">Pro Bono & Paid</Badge>
                  )}
                  {volunteer.volunteerType === "free" && (
                    <Badge className="bg-green-100 text-green-800">Pro Bono</Badge>
                  )}
                </div>

                {/* Skills - always visible */}
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {volunteer.skills.slice(0, 6).map((skill, index) => (
                    <Badge key={index} className="bg-primary/10 text-primary border-0">
                      {getSkillName(skill.categoryId, skill.subskillId)}
                    </Badge>
                  ))}
                  {volunteer.skills.length > 6 && (
                    <Badge variant="outline">+{volunteer.skills.length - 6} more</Badge>
                  )}
                </div>
              </div>
              
              {/* Action Button */}
              <div>
                {isLocked ? (
                  <UnlockProfileButton 
                    volunteerId={volunteer.id}
                    volunteerName="this volunteer"
                  />
                ) : volunteer.canMessage ? (
                  <Button className="bg-primary hover:bg-primary/90">
                    Contact Volunteer
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Locked State Info */}
              {isLocked && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Lock className="h-8 w-8 text-amber-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">
                          This is a Free Volunteer Profile
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          To view contact details, bio, portfolio, and connect with this volunteer,
                          please unlock their profile. This helps support our platform and ensures
                          quality connections.
                        </p>
                        <UnlockProfileButton 
                          volunteerId={volunteer.id}
                          volunteerName="this volunteer"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLocked ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full animate-pulse" />
                      <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
                      <div className="h-4 bg-muted rounded w-4/5 animate-pulse" />
                      <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Unlock profile to view full bio
                      </p>
                    </div>
                  ) : volunteer.bio ? (
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {volunteer.bio}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No bio provided yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Skills & Expertise */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Expertise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {volunteer.skills.map((skill, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="font-medium text-foreground">
                          {getSkillName(skill.categoryId, skill.subskillId)}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {skill.level}
                        </Badge>
                      </div>
                    ))}
                    {volunteer.skills.length === 0 && (
                      <p className="text-muted-foreground italic">
                        No skills listed yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Causes */}
              <Card>
                <CardHeader>
                  <CardTitle>Causes They Care About</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {volunteer.causes.map((cause, index) => (
                      <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                        {cause}
                      </Badge>
                    ))}
                    {volunteer.causes.length === 0 && (
                      <p className="text-muted-foreground italic">
                        No causes specified yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Impact Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Impact Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Hours Contributed</span>
                    <span className="font-semibold text-foreground">{volunteer.hoursContributed}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Projects Completed</span>
                    <span className="font-semibold text-foreground">{volunteer.completedProjects}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                    <span className="text-sm text-primary">Estimated Value</span>
                    <span className="font-semibold text-primary">
                      ₹{(volunteer.hoursContributed * 2000).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Work Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Work Mode</span>
                    <Badge variant="outline" className="capitalize">{volunteer.workMode}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hours/Week</span>
                    <span className="text-sm font-medium">{volunteer.hoursPerWeek}</span>
                  </div>
                  {volunteer.hourlyRate && !isLocked && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Hourly Rate</span>
                      <span className="text-sm font-medium">₹{volunteer.hourlyRate}/hr</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-secondary" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {volunteer.rating >= 4.5 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center">
                        <Star className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Top Rated</p>
                        <p className="text-xs text-muted-foreground">{volunteer.rating.toFixed(1)}+ rating</p>
                      </div>
                    </div>
                  )}
                  {volunteer.hoursContributed >= 100 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">100+ Hours</p>
                        <p className="text-xs text-muted-foreground">Volunteer milestone</p>
                      </div>
                    </div>
                  )}
                  {volunteer.completedProjects >= 10 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">10+ Projects</p>
                        <p className="text-xs text-muted-foreground">Completed milestone</p>
                      </div>
                    </div>
                  )}
                  {volunteer.isVerified && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Verified</p>
                        <p className="text-xs text-muted-foreground">Identity confirmed</p>
                      </div>
                    </div>
                  )}
                  {volunteer.rating < 4.5 && volunteer.hoursContributed < 100 && volunteer.completedProjects < 10 && !volunteer.isVerified && (
                    <p className="text-muted-foreground italic text-sm">
                      No achievements yet. Complete projects to earn badges!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Links - only if unlocked */}
              {!isLocked && (volunteer.linkedinUrl || volunteer.portfolioUrl) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Connect</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {volunteer.linkedinUrl && (
                      <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                        <Link href={volunteer.linkedinUrl} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          LinkedIn Profile
                        </Link>
                      </Button>
                    )}
                    {volunteer.portfolioUrl && (
                      <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                        <Link href={volunteer.portfolioUrl} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Portfolio Website
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
