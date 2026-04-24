import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { WelcomeToast } from "@/components/dashboard/welcome-toast"
import { SubscriptionExpiryToast } from "@/components/dashboard/subscription-expiry-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { StatCard } from "@/components/ui/stat-card"
import { getVolunteerProfile, getMyApplications, getMatchedOpportunitiesForVolunteer, getVolunteerSubscriptionStatus } from "@/lib/actions"
import { Clock, CheckCircle2, FolderKanban, TrendingUp, Star, ArrowRight, Edit, Briefcase, CreditCard, Zap, AlertTriangle, ChevronDown, Sparkles, Target, Calendar, MapPin, ExternalLink, Heart } from "lucide-react"
import { AIMatchExplanation } from "@/components/ai/match-explanation"
import Link from "next/link"
import { resolveSkillName } from "@/lib/skills-data"
import { stripMarkdown } from "@/lib/strip-markdown"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"

export default async function VolunteerDashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any

  const reqHeaders = await headers()
  const cookieHeader = reqHeaders.get("cookie") || ""
  console.log("[volunteer-dashboard] SSR auth check â€” cookie header present:", !!cookieHeader)
  console.log("[volunteer-dashboard] cookies:", cookieHeader.split(";").map(c => c.trim().split("=")[0]).join(", "))

  const session = await auth.api.getSession({
    headers: reqHeaders,
  })

  console.log("[volunteer-dashboard] getSession result:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    role: session?.user?.role,
    isOnboarded: (session?.user as any)?.isOnboarded,
    email: session?.user?.email,
  })

  if (!session?.user) {
    console.log("[volunteer-dashboard] NO SESSION â€” redirecting to signin")
    redirect(`/${lang}/auth/signin`)
  }

  // Role verification: Ensure user is a volunteer
  if (session.user.role !== "volunteer") {
    console.log("[volunteer-dashboard] wrong role:", session.user.role, "â€” redirecting")
    if (session.user.role === "ngo") {
      redirect(`/${lang}/ngo/dashboard`)
    } else if (session.user.role === "admin") {
      redirect(`/${lang}/admin`)
    } else {
      redirect(`/${lang}/auth/role-select`)
    }
  }

  // Redirect to onboarding if not completed
  if (!session.user.isOnboarded) {
    console.log("[volunteer-dashboard] not onboarded â€” redirecting to onboarding")
    redirect(`/${lang}/volunteer/onboarding`)
  }

  const profile = await getVolunteerProfile()
  const applications = await getMyApplications()
  const matchedOpportunities = await getMatchedOpportunitiesForVolunteer()
  const subscriptionStatus = await getVolunteerSubscriptionStatus()

  // Calculate stats
  const pendingApplications = applications.filter((a) => a.status === "pending")
  const acceptedApplications = applications.filter((a) => a.status === "accepted")
  const completedProjects = profile?.completedProjects || 0
  const hoursContributed = profile?.hoursContributed || 0
  
  // Profile completion calculation
  let profileCompletion = 20 // Base for having account
  if (profile?.phone) profileCompletion += 10
  if (profile?.location) profileCompletion += 10
  if (profile?.bio) profileCompletion += 15
  if (profile?.skills?.length) profileCompletion += 20
  if (profile?.causes?.length) profileCompletion += 10
  if (profile?.linkedinUrl || profile?.portfolioUrl) profileCompletion += 15

  const rejectedApplications = applications.filter((a) => a.status === "rejected")

  return (
    <>
      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>
      {(subscriptionStatus?.plan === "pro" || subscriptionStatus?.isExpired) && subscriptionStatus?.expiryDate && (() => {
        const daysLeft = Math.ceil((new Date(subscriptionStatus.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return daysLeft <= 7 ? <SubscriptionExpiryToast daysLeft={daysLeft} role="volunteer" locale={lang} /> : null
      })()}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                {session.user.name?.charAt(0) || "V"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {session.user.name?.split(" ")[0] || (dict.volunteer?.dashboard?.fallbackName || "Candidate")}!
              </h1>
              <p className="text-muted-foreground">{dict.volunteer?.dashboard?.subtitle || "Here's what's happening with your impact journey."}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/volunteer/profile"><Edit className="h-4 w-4 mr-1.5" />Edit Profile</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/projects"><Briefcase className="h-4 w-4 mr-1.5" />Browse</Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FolderKanban className="h-5 w-5" />}
            tone="primary"
            value={applications.length}
            label={dict.volunteer?.dashboard?.statsApplications || "Applications"}
            badge={pendingApplications.length > 0 ? `${pendingApplications.length} pending` : undefined}
          />
          <StatCard
            icon={<Target className="h-5 w-5" />}
            tone="blue"
            value={acceptedApplications.length}
            label={dict.volunteer?.dashboard?.statsActiveOpportunities || "Active"}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="emerald"
            value={completedProjects}
            label={dict.volunteer?.dashboard?.statsCompleted || "Completed"}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            tone="violet"
            value={`${hoursContributed}h`}
            label={dict.volunteer?.dashboard?.statsHoursGiven || "Hours Given"}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Opportunities with Tabs */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {dict.volunteer?.dashboard?.recommendedOpportunities || "Recommended Jobs"}
                    </CardTitle>
                    <CardDescription className="mt-1">AI-matched to your skills and interests</CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/volunteer/opportunities">{dict.volunteer?.common?.viewAll || "View All"}</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {matchedOpportunities.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">{dict.volunteer?.dashboard?.noMatchesYet || "No jobs matched yet"}</p>
                    <p className="text-sm text-muted-foreground">{dict.volunteer?.dashboard?.completeProfilePrompt || "Complete your profile to get personalized recommendations"}</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/volunteer/profile">{dict.volunteer?.common?.completeProfile || "Complete Profile"}</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matchedOpportunities.slice(0, 5).map((match) => (
                      <div key={match.projectId} className="group relative">
                        <Link href={`/projects/${match.projectId}`} className="block p-4 rounded-xl border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {match.project.title}
                            </h3>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className={`shrink-0 ${
                                    match.score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                    match.score >= 50 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                  }`}>
                                    {Math.round(match.score)}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Match score based on your skills</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{stripMarkdown(match.project.description)}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 capitalize">
                              <MapPin className="h-3 w-3" />{match.project.workMode}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{match.project.timeCommitment}
                            </span>
                          </div>
                        </Link>
                        <AIMatchExplanation
                          volunteerSkills={profile?.skills?.map((s: any) => s.name || s.subskillId) || []}
                          volunteerBio={profile?.bio}
                          volunteerLocation={profile?.location}
                          projectTitle={match.project.title}
                          projectDescription={match.project.description}
                          projectSkills={match.project.skillsRequired?.map((s: any) => s.subskillId) || []}
                          matchScore={match.score}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Application History with Tabs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>My Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="pending" className="text-xs sm:text-sm">
                      Pending
                      {pendingApplications.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{pendingApplications.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="accepted" className="text-xs sm:text-sm">
                      Accepted
                      {acceptedApplications.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{acceptedApplications.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="text-xs sm:text-sm">
                      Rejected
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending">
                    {pendingApplications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No pending applications</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingApplications.slice(0, 5).map((app: any) => (
                          <div key={app._id?.toString()} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{app.projectTitle || "Opportunity"}</p>
                              <p className="text-xs text-muted-foreground">{new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">Pending</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="accepted">
                    {acceptedApplications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No accepted applications yet</p>
                    ) : (
                      <div className="space-y-2">
                        {acceptedApplications.slice(0, 5).map((app: any) => (
                          <div key={app._id?.toString()} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/10 hover:bg-green-100 dark:hover:bg-green-950/20 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{app.projectTitle || "Opportunity"}</p>
                              <p className="text-xs text-muted-foreground">{new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Badge className="bg-green-100 text-green-700 text-[10px] shrink-0">Accepted</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="rejected">
                    {rejectedApplications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No rejected applications</p>
                    ) : (
                      <div className="space-y-2">
                        {rejectedApplications.slice(0, 5).map((app: any) => (
                          <div key={app._id?.toString()} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{app.projectTitle || "Opportunity"}</p>
                              <p className="text-xs text-muted-foreground">{new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0 text-red-600">Rejected</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-5">
                  <Avatar className="h-20 w-20 mb-4 border-2 border-primary/20">
                    <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {session.user.name?.charAt(0) || "V"}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-foreground">{session.user.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile?.location || (dict.volunteer?.common?.locationNotSet || "Location not set")}</p>
                  {profile?.rating && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium text-sm">{profile.rating}</span>
                      <span className="text-xs text-muted-foreground">({completedProjects} {dict.volunteer?.dashboard?.tasks || "tasks"})</span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Profile Completion */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{dict.volunteer?.common?.profileCompletion || "Profile Completion"}</span>
                    <span className="font-semibold">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-2" />
                  {profileCompletion < 100 && (
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                      <Link href="/volunteer/profile">Complete your profile to get better matches <ArrowRight className="h-3 w-3 ml-1" /></Link>
                    </Button>
                  )}
                </div>

                {/* Skills */}
                {profile?.skills && profile.skills.length > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-foreground py-2 hover:text-primary transition-colors [&[data-state=open]>svg]:rotate-180">
                      {dict.volunteer?.common?.skills || "Skills"} <Badge variant="secondary" className="ml-auto mr-2 text-[10px]">{profile.skills.length}</Badge>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {profile.skills.slice(0, 8).map((skill: any, i: number) => (
                          <HoverCard key={i}>
                            <HoverCardTrigger asChild>
                              <Badge variant="secondary" className="cursor-default text-xs">
                                {resolveSkillName(skill.subskillId)}
                              </Badge>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-48 text-xs" side="top">
                              <p className="font-medium">{resolveSkillName(skill.subskillId)}</p>
                              <p className="text-muted-foreground mt-1">Category: {skill.categoryId || "General"}</p>
                            </HoverCardContent>
                          </HoverCard>
                        ))}
                        {profile.skills.length > 8 && (
                          <Badge variant="outline" className="text-xs">+{profile.skills.length - 8} more</Badge>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>

            {/* Impact Summary */}
            <Card className="bg-linear-to-br from-primary/5 to-purple-500/5 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  {dict.volunteer?.dashboard?.yourImpact || "Your Impact"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-2">
                  <p className="text-3xl font-bold text-primary">
                    ${(hoursContributed * 500).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{dict.volunteer?.dashboard?.estimatedValueContributed || "Estimated value contributed"}</p>
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{hoursContributed}</p>
                    <p className="text-[10px] text-muted-foreground">Hours</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{completedProjects}</p>
                    <p className="text-[10px] text-muted-foreground">Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {dict.volunteer?.dashboard?.subscription || "Subscription"}
                  </CardTitle>
                  {subscriptionStatus?.plan === "pro" && (
                    <Badge className="bg-linear-to-r from-primary to-purple-600 text-white text-[10px]">
                      <Zap className="h-3 w-3 mr-1" />
                      PRO
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscriptionStatus?.plan === "free" ? (
                  <>
                    {subscriptionStatus?.isExpired && (
                      <div className="p-3 rounded-lg border bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">Pro plan expired</span>
                        </div>
                        <Button asChild size="sm" className="w-full" variant="destructive">
                          <Link href={`/${lang}/pricing`}><Zap className="h-4 w-4 mr-2" />Renew Now</Link>
                        </Button>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="text-muted-foreground">{dict.volunteer?.dashboard?.applicationsThisMonth || "Applications this month"}</span>
                        <span className="font-semibold">{subscriptionStatus.applicationsUsed} / 3</span>
                      </div>
                      <Progress value={(subscriptionStatus.applicationsUsed / 3) * 100} className="h-2" />
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium mb-1">{dict.volunteer?.dashboard?.upgradeProTitle || "Upgrade to Pro"}</p>
                      <p className="text-xs text-muted-foreground mb-3">{dict.volunteer?.dashboard?.upgradeProDesc || "Unlimited applications with Pro"}</p>
                      <Button asChild size="sm" className="w-full">
                        <Link href={`/${lang}/pricing`}><Zap className="h-4 w-4 mr-2" />{dict.volunteer?.common?.upgradeToPro || "Upgrade to Pro"}</Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-lg bg-linear-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-medium">{dict.volunteer?.dashboard?.proPlanActive || "Pro Plan Active"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{dict.volunteer?.dashboard?.unlimitedApplications || "Unlimited applications"}</p>
                      {subscriptionStatus?.expiryDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {dict.volunteer?.dashboard?.renews || "Renews:"} {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {subscriptionStatus?.expiryDate && (() => {
                      const daysLeft = Math.ceil((new Date(subscriptionStatus.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      if (daysLeft > 7) return null
                      const isExpired = daysLeft <= 0
                      return (
                        <div className={`p-3 rounded-lg border ${isExpired ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className={`h-4 w-4 ${isExpired ? "text-red-500" : "text-yellow-500"}`} />
                            <span className={`text-sm font-medium ${isExpired ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                              {isExpired ? "Plan expired" : `Expires in ${daysLeft}d`}
                            </span>
                          </div>
                          <Button asChild size="sm" className="w-full" variant={isExpired ? "destructive" : "default"}>
                            <Link href={`/${lang}/pricing`}><Zap className="h-4 w-4 mr-2" />{isExpired ? "Renew Now" : "Renew Early"}</Link>
                          </Button>
                        </div>
                      )
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
