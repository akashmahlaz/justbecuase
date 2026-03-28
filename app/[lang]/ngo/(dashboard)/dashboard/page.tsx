import { redirect } from "next/navigation"
import { Suspense } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDictionary } from "@/app/[lang]/dictionaries"
import { Locale } from "@/lib/i18n-config"
import { WelcomeToast } from "@/components/dashboard/welcome-toast"
import { SubscriptionExpiryToast } from "@/components/dashboard/subscription-expiry-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Progress } from "@/components/ui/progress"
import { getNGOProfile, getMyProjectsAsNGO, getNGOApplicationsEnriched, getNGOSubscriptionStatus, getRecommendedVolunteersForNGO } from "@/lib/actions"
import { PlusCircle, FolderKanban, Users, CheckCircle2, MessageSquare, Clock, CreditCard, Zap, Unlock, Sparkles, AlertTriangle, TrendingUp, Building2, MapPin, ChevronDown } from "lucide-react"
import Link from "next/link"

export default async function NGODashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any;

  const reqHeaders = await headers()
  const cookieHeader = reqHeaders.get("cookie") || ""
  console.log("[ngo-dashboard] SSR auth check — cookie header present:", !!cookieHeader)
  console.log("[ngo-dashboard] cookies:", cookieHeader.split(";").map(c => c.trim().split("=")[0]).join(", "))

  const session = await auth.api.getSession({
    headers: reqHeaders,
  })

  console.log("[ngo-dashboard] getSession result:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    role: session?.user?.role,
    isOnboarded: (session?.user as any)?.isOnboarded,
    email: session?.user?.email,
  })

  if (!session?.user) {
    console.log("[ngo-dashboard] NO SESSION — redirecting to signin")
    redirect(`/${lang}/auth/signin`)
  }

  // Role verification: Ensure user is an NGO
  if (session.user.role !== "ngo") {
    console.log("[ngo-dashboard] wrong role:", session.user.role, "— redirecting")
    if (session.user.role === "volunteer") {
      redirect(`/${lang}/volunteer/dashboard`)
    } else if (session.user.role === "admin") {
      redirect(`/${lang}/admin`)
    } else {
      redirect(`/${lang}/auth/role-select`)
    }
  }

  // Redirect to onboarding if not completed
  if (!session.user.isOnboarded) {
    console.log("[ngo-dashboard] not onboarded — redirecting to onboarding")
    redirect(`/${lang}/ngo/onboarding`)
  }

  const ngoProfile = await getNGOProfile()
  const projects = await getMyProjectsAsNGO()
  const enrichedApplications = await getNGOApplicationsEnriched()
  const subscriptionStatus = await getNGOSubscriptionStatus()
  const recommendedVolunteers = await getRecommendedVolunteersForNGO()

  // Calculate stats
  const activeProjects = projects.filter((p) => p.status === "open" || p.status === "active")
  const completedProjects = projects.filter((p) => p.status === "completed")
  const pendingApplications = enrichedApplications.filter((a: any) => a.status === "pending")
  const shortlistedApplications = enrichedApplications.filter((a: any) => a.status === "shortlisted")

  return (
    <>
      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>
      {(subscriptionStatus?.plan === "pro" || subscriptionStatus?.isExpired) && subscriptionStatus?.expiryDate && (() => {
        const daysLeft = Math.ceil((new Date(subscriptionStatus.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return daysLeft <= 7 ? <SubscriptionExpiryToast daysLeft={daysLeft} role="ngo" locale={lang} /> : null
      })()}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                {ngoProfile?.logo ? (
                  <AvatarImage src={ngoProfile.logo} alt={ngoProfile?.organizationName || ""} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  <Building2 className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {dict.ngo?.dashboard?.welcome || "Welcome, "}{ngoProfile?.organizationName || session.user.name}
                </h1>
                <p className="text-sm text-muted-foreground">{dict.ngo?.dashboard?.subtitle || "Manage your opportunities and connect with skilled impact agents."}</p>
                {subscriptionStatus?.plan === "pro" && (
                  <Badge className="mt-1 bg-linear-to-r from-primary to-primary/70 text-white text-[10px]">
                    <Zap className="h-3 w-3 mr-1" /> PRO
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/ngo/profile">
                  <Building2 className="h-4 w-4 mr-2" />
                  {dict.ngo?.common?.editProfile || "Edit Profile"}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/ngo/post-project">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {dict.ngo?.common?.postNewOpportunity || "Post New Opportunity"}
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <TooltipProvider>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="hover:shadow-md transition-shadow cursor-default">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FolderKanban className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{activeProjects.length}</p>
                          <p className="text-xs text-muted-foreground">{dict.ngo?.common?.activeOpportunities || "Active"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>Currently open and active opportunities</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="hover:shadow-md transition-shadow cursor-default">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
                          <Users className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{pendingApplications.length}</p>
                          <p className="text-xs text-muted-foreground">{dict.ngo?.common?.pendingApplications || "Pending"}</p>
                        </div>
                        {pendingApplications.length > 0 && (
                          <Badge className="ml-auto bg-yellow-100 text-yellow-700 text-[10px]">{pendingApplications.length} new</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>Applications awaiting your review</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="hover:shadow-md transition-shadow cursor-default">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{completedProjects.length}</p>
                          <p className="text-xs text-muted-foreground">{dict.ngo?.common?.completed || "Completed"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>Successfully completed opportunities</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="hover:shadow-md transition-shadow cursor-default">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{shortlistedApplications.length}</p>
                          <p className="text-xs text-muted-foreground">{dict.ngo?.common?.shortlisted || "Shortlisted"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>Candidates you&apos;ve shortlisted</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Opportunities */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{dict.ngo?.common?.activeOpportunities || "Active Opportunities"}</CardTitle>
                      <CardDescription>{activeProjects.length} open {activeProjects.length === 1 ? "opportunity" : "opportunities"}</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/ngo/projects">{dict.ngo?.common?.viewAll || "View All"}</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">{dict.ngo?.dashboard?.noActiveOpportunities || "No active opportunities"}</p>
                      <Button variant="link" asChild>
                        <Link href="/ngo/post-project">{dict.ngo?.dashboard?.createFirstOpportunity || "Create your first opportunity"}</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activeProjects.slice(0, 4).map((project, idx) => {
                        const deadline = project.deadline ? new Date(project.deadline) : null
                        const now = new Date()
                        const daysUntilDeadline = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
                        const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0
                        const isDeadlineSoon = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 3
                        const projectApps = enrichedApplications.filter((a: any) => a.projectId === project._id?.toString())
                        const projectPending = projectApps.filter((a: any) => a.status === "pending").length

                        return (
                          <div key={project._id?.toString()}>
                            {idx > 0 && <Separator className="my-3" />}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
                                  <Badge variant="outline" className="text-[10px] shrink-0">{project.projectType}</Badge>
                                  {isOverdue && (
                                    <Badge variant="destructive" className="text-[10px] shrink-0">
                                      <AlertTriangle className="h-3 w-3 mr-0.5" /> Overdue
                                    </Badge>
                                  )}
                                  {isDeadlineSoon && (
                                    <Badge className="bg-yellow-100 text-yellow-700 text-[10px] shrink-0">
                                      <Clock className="h-3 w-3 mr-0.5" />
                                      {daysUntilDeadline === 0 ? "Due today" : `${daysUntilDeadline}d left`}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    {project.applicantsCount || 0} applications
                                    {projectPending > 0 && (
                                      <Badge className="ml-1 bg-yellow-100 text-yellow-700 text-[10px] px-1 py-0">{projectPending} new</Badge>
                                    )}
                                  </span>
                                  {project.workMode && (
                                    <span className="flex items-center gap-1 capitalize">
                                      <MapPin className="h-3.5 w-3.5" />
                                      {project.workMode}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild className="shrink-0">
                                <Link href={`/ngo/applications?project=${project._id?.toString()}`}>
                                  {dict.ngo?.common?.viewApplications || "View Applications"}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Applications with Tabs */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{dict.ngo?.dashboard?.recentApplications || "Recent Applications"}</CardTitle>
                      <CardDescription>{enrichedApplications.length} total applications</CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/ngo/applications">{dict.ngo?.common?.viewAll || "View All"}</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="pending" className="flex-1">
                        Pending
                        {pendingApplications.length > 0 && (
                          <Badge className="ml-1.5 bg-yellow-100 text-yellow-700 text-[10px] px-1.5">{pendingApplications.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="shortlisted" className="flex-1">
                        Shortlisted
                        {shortlistedApplications.length > 0 && (
                          <Badge className="ml-1.5 bg-blue-100 text-blue-700 text-[10px] px-1.5">{shortlistedApplications.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    </TabsList>

                    {["pending", "shortlisted", "all"].map((tab) => {
                      const tabApps = tab === "all" ? enrichedApplications : tab === "pending" ? pendingApplications : shortlistedApplications
                      return (
                        <TabsContent key={tab} value={tab}>
                          {tabApps.length === 0 ? (
                            <div className="text-center py-6">
                              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No {tab === "all" ? "" : tab + " "}applications</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {tabApps.slice(0, 5).map((application: any, idx: number) => (
                                <div key={application._id?.toString()}>
                                  {idx > 0 && <Separator className="my-2" />}
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <Link
                                        href="/ngo/applications"
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                      >
                                        <Avatar className="h-9 w-9">
                                          {application.volunteerProfile?.avatar ? (
                                            <AvatarImage src={application.volunteerProfile.avatar} alt="" />
                                          ) : null}
                                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                            {application.volunteerProfile?.name?.charAt(0) || "V"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-foreground truncate">
                                            {application.volunteerProfile?.name || "Impact Agent"}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {application.project?.title || "Opportunity"}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <Badge variant={application.status === "pending" ? "outline" : application.status === "shortlisted" ? "default" : "secondary"} className="text-[10px]">
                                            {application.status}
                                          </Badge>
                                          <span className="text-[10px] text-muted-foreground">
                                            {new Date(application.appliedAt || application.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </Link>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72">
                                      <div className="flex gap-3">
                                        <Avatar className="h-10 w-10">
                                          {application.volunteerProfile?.avatar ? (
                                            <AvatarImage src={application.volunteerProfile.avatar} alt="" />
                                          ) : null}
                                          <AvatarFallback className="text-sm bg-primary/10 text-primary">
                                            {application.volunteerProfile?.name?.charAt(0) || "V"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-sm font-semibold">{application.volunteerProfile?.name || "Impact Agent"}</p>
                                          <p className="text-xs text-muted-foreground">{application.volunteerProfile?.headline || "Skilled professional"}</p>
                                          {application.volunteerProfile?.skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {application.volunteerProfile.skills.slice(0, 4).map((s: string) => (
                                                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recommended Volunteers - Best Matches */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {dict.ngo?.dashboard?.bestMatches || "Best Matches"}
                      </CardTitle>
                      <CardDescription>AI-matched impact agents</CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/ngo/find-talent">{dict.ngo?.dashboard?.findMore || "Find More"}</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recommendedVolunteers.length === 0 ? (
                    <div className="text-center py-6">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{dict.ngo?.dashboard?.noMatchingAgents || "No matching impact agents yet"}</p>
                      <Button variant="link" size="sm" asChild>
                        <Link href="/ngo/post-project">{dict.ngo?.common?.postOpportunity || "Post Opportunity"}</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {recommendedVolunteers.slice(0, 4).map((match, idx) => (
                        <div key={match.volunteerId}>
                          {idx > 0 && <Separator className="my-2" />}
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Link
                                href="/ngo/find-talent"
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <Avatar className="h-9 w-9">
                                  {match.volunteer.avatar ? (
                                    <AvatarImage src={match.volunteer.avatar} alt="" />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {match.volunteer.name?.charAt(0) || "V"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {match.volunteer.name || "Impact Agent"}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {match.volunteer.headline || "Skilled professional"}
                                  </p>
                                </div>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        className={
                                          match.score >= 70
                                            ? "bg-green-100 text-green-700"
                                            : match.score >= 50
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }
                                      >
                                        {match.score}%
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>AI match score based on skills and availability</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </Link>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    {match.volunteer.avatar ? <AvatarImage src={match.volunteer.avatar} alt="" /> : null}
                                    <AvatarFallback className="text-xs">{match.volunteer.name?.charAt(0) || "V"}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-semibold">{match.volunteer.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{match.volunteer.headline}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Match:</span>
                                  <Progress value={match.score} className="h-1.5 flex-1" />
                                  <span className="text-xs font-medium">{match.score}%</span>
                                </div>
                                {(match.volunteer.skills?.length ?? 0) > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {match.volunteer.skills?.slice(0, 5).map((s: string) => (
                                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{dict.ngo?.dashboard?.quickActions || "Quick Actions"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start" size="sm">
                    <Link href="/ngo/post-project">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      {dict.ngo?.common?.postNewOpportunity || "Post New Opportunity"}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start" size="sm">
                    <Link href="/ngo/find-talent">
                      <Users className="h-4 w-4 mr-2" />
                      {dict.ngo?.dashboard?.browseImpactAgents || "Browse Impact Agents"}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start" size="sm">
                    <Link href="/ngo/messages">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {dict.ngo?.common?.messages || "Messages"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Subscription Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      {dict.ngo?.dashboard?.subscription || "Subscription"}
                    </CardTitle>
                    {subscriptionStatus?.plan === "pro" && (
                      <Badge className="bg-linear-to-r from-primary to-secondary text-white">
                        <Zap className="h-3 w-3 mr-1" />
                        {dict.ngo?.common?.pro || "PRO"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscriptionStatus?.plan === "free" ? (
                    <>
                      {subscriptionStatus?.isExpired && (
                        <div className="p-3 rounded-lg border bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-700 dark:text-red-400">Your Pro plan has expired</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">You've been downgraded to the Free plan. Renew to regain unlimited access.</p>
                          <Button asChild size="sm" className="w-full" variant="destructive">
                            <Link href={`/${lang}/pricing`}>
                              <Zap className="h-4 w-4 mr-2" />
                              Renew Now
                            </Link>
                          </Button>
                        </div>
                      )}
                      <div className="p-4 rounded-lg bg-muted/50 border border-yellow-200">
                        <div className="flex items-center gap-2 text-yellow-600 mb-2">
                          <Unlock className="h-4 w-4" />
                          <span className="text-sm font-medium">{dict.ngo?.dashboard?.freePlanNoUnlocks || "Free Plan - No Unlocks"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {dict.ngo?.dashboard?.upgradeToPro || "Upgrade to Pro to unlock impact agent profiles"}
                        </p>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm font-medium text-foreground mb-1">
                          {dict.ngo?.dashboard?.upgradeForUnlimited || "Upgrade to Pro for unlimited unlocks"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          {dict.ngo?.dashboard?.viewContactDetails || "View contact details of any impact agent"}
                        </p>
                        <Button asChild size="sm" className="w-full">
                          <Link href={`/${lang}/pricing`}>
                            <Zap className="h-4 w-4 mr-2" />
                            {dict.ngo?.common?.upgradeToPro || "Upgrade to Pro"}
                          </Link>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                    <div className="p-4 rounded-lg bg-linear-to-br from-primary/10 to-secondary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">{dict.ngo?.dashboard?.proPlanActive || "Pro Plan Active"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dict.ngo?.dashboard?.unlimitedUnlocks || "Unlimited impact agent profile unlocks"}
                      </p>
                      {subscriptionStatus?.expiryDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {dict.ngo?.dashboard?.renews || "Renews: "}{new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
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
                              {isExpired ? "Your Pro plan has expired" : `Pro plan expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {isExpired ? "You've been downgraded to the Free plan. Renew to regain unlimited access." : "Renew now to keep unlimited unlocks and Pro features."}
                          </p>
                          <Button asChild size="sm" className="w-full" variant={isExpired ? "destructive" : "default"}>
                            <Link href={`/${lang}/pricing`}>
                              <Zap className="h-4 w-4 mr-2" />
                              {isExpired ? "Renew Now" : "Renew Early"}
                            </Link>
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
