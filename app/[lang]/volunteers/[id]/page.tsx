import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getDictionary } from "@/app/[lang]/dictionaries"
import { i18n, type Locale } from "@/lib/i18n-config"
import { absoluteUrl } from "@/lib/seo"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShareButton } from "@/components/share-button"
import { FollowButton } from "@/components/follow-button"
import { FollowStatsDisplay } from "@/components/follow-stats-display"
import { getVolunteerProfileView, getNGOSubscriptionStatus, getFollowStats, getCurrentUser, getReviewsForUser } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import { Star, MapPin, Clock, CheckCircle, ExternalLink, Award, TrendingUp, Lock, Crown, User, MessageSquare } from "lucide-react"
import { ContactVolunteerButton } from "@/components/messages/contact-volunteer-button"
import { SkillEndorsements } from "@/components/endorsements/skill-endorsements"
import { getCurrencySymbol } from "@/lib/currency"
import { ReviewsList } from "@/components/reviews/review-form"

// Helper function to get skill name from ID
function getSkillName(categoryId: string, subskillId: string): string {
  const category = skillCategories.find((c) => c.id === categoryId)
  if (!category) return subskillId
  const subskill = category.subskills.find((s) => s.id === subskillId)
  return subskill?.name || subskillId
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}): Promise<Metadata> {
  const { id, lang } = await params
  const volunteer = await getVolunteerProfileView(id)

  if (!volunteer) {
    return { title: "Candidate Not Found" }
  }

  const name = volunteer.name || "Candidate"
  const title = (volunteer as any).title ? `${name} - ${(volunteer as any).title}` : name
  const description = (volunteer.bio || `${name} is a skilled candidate on JustBeCause Network`).slice(0, 160)
  const skills = (volunteer.skills || [])
    .slice(0, 5)
    .map((s: any) => getSkillName(s.categoryId || s.category, s.subskillId || s.skill))
    .filter(Boolean)

  return {
    title,
    description: skills.length
      ? `${description}. Skills: ${skills.join(", ")}`
      : description,
    openGraph: {
      title: `${title} | JustBeCause Network`,
      description,
      url: absoluteUrl(`/${lang}/volunteers/${id}`),
      type: "profile",
      images: volunteer.avatar ? [{ url: volunteer.avatar, width: 400, height: 400, alt: name }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${title} | JustBeCause Network`,
      description,
      site: "@justbecausenet",
      images: volunteer.avatar ? [volunteer.avatar] : undefined,
    },
    alternates: {
      canonical: absoluteUrl(`/${lang}/volunteers/${id}`),
      languages: Object.fromEntries(
        i18n.locales.map((l) => [l, absoluteUrl(`/${l}/volunteers/${id}`)])
      ),
    },
  }
}

export default async function VolunteerProfilePage({ params }: { params: Promise<{ id: string; lang: string }> }) {
  const { id, lang } = await params
  const dict = await getDictionary(lang as Locale) as any
  
  // Get volunteer profile with visibility rules applied
  const volunteer = await getVolunteerProfileView(id)
  
  // Get Enterprise subscription status if viewing as Enterprise
  const ngoSubscription = await getNGOSubscriptionStatus()

  // Get follow stats for this volunteer
  const followStatsResult = await getFollowStats(id)
  const followStats = followStatsResult.success ? followStatsResult.data! : { followersCount: 0, followingCount: 0, isFollowing: false }

  if (!volunteer) {
    notFound()
  }

  // Get current user for endorsements
  const currentUser = await getCurrentUser()
  const currentUserId = currentUser?.id || ""

  // Get reviews for this volunteer
  const reviewsResult = await getReviewsForUser(id)
  const reviews = reviewsResult.success ? reviewsResult.data || [] : []

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
              <div className="relative flex-shrink-0">
                {volunteer.avatar && !isLocked ? (
                  <img
                    src={volunteer.avatar}
                    alt={volunteer.name || (dict.volunteerDetail?.impactAgent || "Candidate")}
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
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {isLocked ? (
                    <span className="flex items-center gap-2 justify-center md:justify-start">
                      <Lock className="h-5 w-5" />
                      {dict.volunteerDetail?.profileLocked || "Profile Locked"}
                    </span>
                  ) : (
                    volunteer.name || (dict.volunteerDetail?.impactAgent || "Candidate")
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
                    {volunteer.location || (dict.volunteerDetail?.locationNotSpecified || "Location not specified")}
                  </div>
                  <div className="flex items-center gap-1 text-foreground">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {(dict.volunteerDetail?.ratingLabel || "{rating} rating").replace("{rating}", volunteer.rating.toFixed(1))}
                  </div>
                  <div className="flex items-center gap-1 text-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    {(dict.volunteerDetail?.opportunitiesCompleted || "{count} jobs completed").replace("{count}", String(volunteer.completedProjects))}
                  </div>
                  {volunteer.volunteerType === "paid" && (
                    <Badge variant="secondary">{dict.volunteerDetail?.paidBadge || "Paid"}</Badge>
                  )}
                  {volunteer.volunteerType === "free" && (
                    <Badge className="bg-green-100 text-green-800">{dict.volunteerDetail?.proBonoLabel || "Pro Bono"}</Badge>
                  )}
                  {volunteer.volunteerType === "both" && (
                    <Badge className="bg-blue-100 text-blue-800">{dict.volunteerDetail?.freeAndPaid || "Free & Paid"}</Badge>
                  )}
                  {volunteer.volunteerType === "both" && volunteer.freeHoursPerMonth && (
                    <Badge variant="outline">{(dict.volunteerDetail?.freeHoursMonth || "{hours} hrs/month free").replace("{hours}", String(volunteer.freeHoursPerMonth))}</Badge>
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
                    <Badge variant="outline">{(dict.volunteerDetail?.plusMore || "+{count} more").replace("{count}", String(volunteer.skills.length - 6))}</Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 min-w-[170px] w-full md:w-auto">
                {!isLocked && (
                  <FollowButton
                    targetId={id}
                    targetName={volunteer.name || (dict.volunteerDetail?.impactAgent || "Candidate")}
                    isFollowing={followStats.isFollowing}
                    followersCount={followStats.followersCount}
                    showCount={false}
                  />
                )}
                {!isLocked && (
                  <FollowStatsDisplay
                    userId={id}
                    followersCount={followStats.followersCount}
                    followingCount={followStats.followingCount}
                    className="justify-center"
                  />
                )}
                {isLocked ? (
                  <Button asChild className="w-full">
                    <Link href="/pricing">
                      <Crown className="h-4 w-4 mr-2" />
                      {dict.volunteerDetail?.subscribeToView || "Subscribe to View"}
                    </Link>
                  </Button>
                ) : volunteer.canMessage ? (
                  <ContactVolunteerButton
                    volunteerId={volunteer.id}
                    volunteerName={volunteer.name || (dict.volunteerDetail?.impactAgent || "Candidate")}
                    className="w-full bg-primary hover:bg-primary/90"
                  />
                ) : null}
                <ShareButton
                  url={`/volunteers/${id}`}
                  title={isLocked ? (dict.volunteerDetail?.shareTitle || "Skilled Candidate on JustBeCause") : (dict.volunteerDetail?.shareTitleWithName || "{name} - Candidate Profile").replace("{name}", volunteer.name)}
                  description={(dict.volunteerDetail?.shareDescription || "Discover this talented candidate with {projects} completed projects and a {rating} rating.").replace("{projects}", String(volunteer.completedProjects)).replace("{rating}", volunteer.rating.toFixed(1))}
                  variant="outline"
                  className="w-full"
                />
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
                      <Crown className="h-8 w-8 text-amber-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">
                          {dict.volunteerDetail?.proRequired || "Pro Subscription Required"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {dict.volunteerDetail?.proRequiredDesc || "This is a free candidate. Subscribe to our Pro plan to view their full profile, contact details, portfolio, and connect with them directly."}
                        </p>
                        <Button asChild>
                          <Link href="/pricing">
                            {dict.volunteerDetail?.upgradeToPro || "Upgrade to Pro"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle>{dict.volunteerDetail?.aboutTitle || "About"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLocked ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full animate-pulse" />
                      <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
                      <div className="h-4 bg-muted rounded w-4/5 animate-pulse" />
                      <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {dict.volunteerDetail?.subscribeToBio || "Subscribe to Pro to view full bio"}
                      </p>
                    </div>
                  ) : volunteer.bio ? (
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {volunteer.bio}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {dict.volunteerDetail?.noBioYet || "No bio provided yet."}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Skills & Expertise with Endorsements */}
              <Card>
                <CardHeader>
                  <CardTitle>{dict.volunteerDetail?.skillsExpertise || "Skills & Expertise"}</CardTitle>
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
                        {dict.volunteerDetail?.noSkillsYet || "No skills listed yet."}
                      </p>
                    )}
                  </div>
                  {/* Skill Endorsements */}
                  {volunteer.skills.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <SkillEndorsements
                        userId={id}
                        skills={volunteer.skills.map(s => ({
                          categoryId: s.categoryId,
                          subskillId: s.subskillId,
                          name: getSkillName(s.categoryId, s.subskillId),
                        }))}
                        currentUserId={currentUserId}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reviews & Ratings */}
              {reviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      {dict.volunteerDetail?.reviewsRatings || "Reviews & Ratings"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReviewsList reviews={reviews} />
                  </CardContent>
                </Card>
              )}

              {/* Causes */}
              <Card>
                <CardHeader>
                  <CardTitle>{dict.volunteerDetail?.causesCareAbout || "Causes They Care About"}</CardTitle>
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
                        {dict.volunteerDetail?.noCausesYet || "No causes specified yet."}
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
                    {dict.volunteerDetail?.impactSummary || "Impact Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">{dict.volunteerDetail?.hoursContributed || "Hours Contributed"}</span>
                    <span className="font-semibold text-foreground">{volunteer.hoursContributed}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">{dict.volunteerDetail?.projectsCompleted || "Projects Completed"}</span>
                    <span className="font-semibold text-foreground">{volunteer.completedProjects}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                    <span className="text-sm text-primary">{dict.volunteerDetail?.estimatedValue || "Estimated Value"}</span>
                    <span className="font-semibold text-primary">
                      ${(volunteer.hoursContributed * 2000).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Work Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>{dict.volunteerDetail?.workPreferences || "Work Preferences"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{dict.volunteerDetail?.workModeLabel || "Work Mode"}</span>
                    <Badge variant="outline" className="capitalize">{volunteer.workMode}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{dict.volunteerDetail?.hoursPerWeek || "Hours/Week"}</span>
                    <span className="text-sm font-medium">{volunteer.hoursPerWeek}</span>
                  </div>
                  {volunteer.hourlyRate && !isLocked && volunteer.volunteerType !== "free" && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{dict.volunteerDetail?.hourlyRate || "Hourly Rate"}</span>
                      <span className="text-sm font-medium">
                        {getCurrencySymbol(volunteer.currency || "USD")}{volunteer.hourlyRate}/hr
                      </span>
                    </div>
                  )}
                  {volunteer.discountedRate && !isLocked && volunteer.volunteerType !== "free" && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{dict.volunteerDetail?.ngoDiscountRate || "Enterprise Discounted Rate"}</span>
                      <span className="text-sm font-medium text-green-600">
                        {getCurrencySymbol(volunteer.currency || "USD")}{volunteer.discountedRate}/hr
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-secondary" />
                    {dict.volunteerDetail?.achievements || "Achievements"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {volunteer.rating >= 4.5 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center">
                        <Star className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{dict.volunteerDetail?.topRated || "Top Rated"}</p>
                        <p className="text-xs text-muted-foreground">{(dict.volunteerDetail?.topRatedDesc || "{rating}+ rating").replace("{rating}", volunteer.rating.toFixed(1))}</p>
                      </div>
                    </div>
                  )}
                  {volunteer.hoursContributed >= 100 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{dict.volunteerDetail?.hours100 || "100+ Hours"}</p>
                        <p className="text-xs text-muted-foreground">{dict.volunteerDetail?.hours100Desc || "Candidate milestone"}</p>
                      </div>
                    </div>
                  )}
                  {volunteer.completedProjects >= 10 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{dict.volunteerDetail?.projects10 || "10+ Projects"}</p>
                        <p className="text-xs text-muted-foreground">{dict.volunteerDetail?.projects10Desc || "Completed milestone"}</p>
                      </div>
                    </div>
                  )}
                  {volunteer.isVerified && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{dict.volunteerDetail?.verified || "Verified"}</p>
                        <p className="text-xs text-muted-foreground">{dict.volunteerDetail?.verifiedDesc || "Identity confirmed"}</p>
                      </div>
                    </div>
                  )}
                  {volunteer.rating < 4.5 && volunteer.hoursContributed < 100 && volunteer.completedProjects < 10 && !volunteer.isVerified && (
                    <p className="text-muted-foreground italic text-sm">
                      {dict.volunteerDetail?.noAchievements || "No achievements yet. Complete projects to earn badges!"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Links - only if unlocked */}
              {!isLocked && (volunteer.linkedinUrl || volunteer.portfolioUrl) && (
                <Card>
                  <CardHeader>
                    <CardTitle>{dict.volunteerDetail?.connect || "Connect"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {volunteer.linkedinUrl && (
                      <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                        <Link href={volunteer.linkedinUrl} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {dict.volunteerDetail?.linkedInProfile || "LinkedIn Profile"}
                        </Link>
                      </Button>
                    )}
                    {volunteer.portfolioUrl && (
                      <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                        <Link href={volunteer.portfolioUrl} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {dict.volunteerDetail?.portfolioWebsite || "Portfolio Website"}
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
