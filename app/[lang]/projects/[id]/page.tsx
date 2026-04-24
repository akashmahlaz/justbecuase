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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollProgress } from "@/components/ui/scroll-progress"
import { getProject, getNGOById, getActiveProjects, hasAppliedToProject, isProjectSaved, getVolunteerProfile } from "@/lib/actions"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { fetchPage, extractPageContent } from "@/lib/scraper/text-extractor"
import { skillCategories } from "@/lib/skills-data"
import { stripMarkdown } from "@/lib/strip-markdown"
import { ApplyButton } from "./apply-button"
import { SaveButton } from "./save-button"
import { ShareButton } from "@/components/share-button"
import { JobPostingJsonLd, BreadcrumbJsonLd } from "@/components/json-ld"
import {
  Clock,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  Building2,
  FileText,
  Eye,
  Briefcase,
  Download,
  AlertCircle,
  Globe,
} from "lucide-react"

// Helper to get skill name
function getSkillName(categoryId: string, subskillId: string): string {
  const category = skillCategories.find((c) => c.id === categoryId)
  if (!category) return subskillId
  const subskill = category.subskills.find((s) => s.id === subskillId)
  return subskill?.name || subskillId
}

// Format date
function formatDate(date?: Date | string, flexibleText: string = "Flexible"): string {
  if (!date) return flexibleText
  const d = new Date(date)
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}): Promise<Metadata> {
  const { id, lang } = await params
  const isExternal = id.startsWith("ext-")

  let title = "Opportunity"
  let description = "View this job on JustBeCause Network"
  let ogImage: string | undefined

  if (isExternal) {
    const extId = id.replace("ext-", "")
    const opportunity = await externalOpportunitiesDb.findById(extId)
    if (opportunity) {
      title = opportunity.title || "Opportunity"
      description = (opportunity.description || "").slice(0, 160).replace(/<[^>]*>/g, "")
    }
  } else {
    const project = await getProject(id)
    if (project) {
      title = project.title
      description = stripMarkdown(project.description || "").slice(0, 160)
      const ngo = await getNGOById(project.ngoId)
      if (ngo) {
        description = `${title} by ${ngo.orgName}. ${description}`
      }
    }
  }

  return {
    title,
    description: description || `View this opportunity on JustBeCause Network`,
    openGraph: {
      title: `${title} | JustBeCause Network`,
      description,
      url: absoluteUrl(`/${lang}/projects/${id}`),
      type: "article",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | JustBeCause Network`,
      description,
      site: "@justbecausenet",
    },
    alternates: {
      canonical: absoluteUrl(`/${lang}/projects/${id}`),
      languages: Object.fromEntries(
        i18n.locales.map((l) => [l, absoluteUrl(`/${l}/projects/${id}`)])
      ),
    },
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string; lang: string }> }) {
  const { id, lang } = await params
  const dict = await getDictionary(lang as Locale) as any;

  // Detect external/partner opportunity (ext- prefix)
  const isExternal = id.startsWith("ext-")
  if (isExternal) {
    const extId = id.replace("ext-", "")
    let opportunity = await externalOpportunitiesDb.findById(extId)
    if (!opportunity) notFound()
    opportunity = await enrichIfNeeded(opportunity)
    return <ExternalOpportunityView opportunity={opportunity} lang={lang} dict={dict} />
  }
  
  // Get project from database
  const project = await getProject(id)
  
  if (!project) {
    // Fallback: check if it's an external opportunity by raw MongoDB ID
    try {
      let opportunity = await externalOpportunitiesDb.findById(id)
      if (opportunity) {
        opportunity = await enrichIfNeeded(opportunity)
        return <ExternalOpportunityView opportunity={opportunity} lang={lang} dict={dict} />
      }
    } catch { /* not a valid ObjectId */ }
    notFound()
  }
  
  // Get Enterprise profile
  const ngo = await getNGOById(project.ngoId)

  // Check if user has applied
  const hasApplied = await hasAppliedToProject(id)
  
  // Check if user has saved this project
  const isSaved = await isProjectSaved(id)

  // Get volunteer profile for AI features (may be null if not logged in or not a volunteer)
  const volunteerProfile = await getVolunteerProfile().catch(() => null)
  
  // Get similar projects (same cause or skills)
  const allProjects = await getActiveProjects(10)
  const similarProjects = allProjects
    .filter(p => p._id?.toString() !== id)
    .filter(p => 
      p.causes.some(c => project.causes.includes(c)) ||
      p.skillsRequired.some(s => 
        project.skillsRequired.some(ps => ps.categoryId === s.categoryId)
      )
    )
    .slice(0, 3)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <JobPostingJsonLd
        title={project.title}
        description={stripMarkdown(project.description || "")}
        orgName={ngo?.orgName || "Organization"}
        location={project.location}
        datePosted={project.createdAt ? new Date(project.createdAt).toISOString() : undefined}
        deadline={project.deadline ? new Date(project.deadline).toISOString() : undefined}
        url={`https://justbecausenetwork.com/${lang}/projects/${id}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: `https://justbecausenetwork.com/${lang}` },
          { name: "Projects", url: `https://justbecausenetwork.com/${lang}/projects` },
          { name: project.title, url: `https://justbecausenetwork.com/${lang}/projects/${id}` },
        ]}
      />
      <Navbar />
      <ScrollProgress className="top-0" />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">{dict.projectDetail?.home || "Home"}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects">{dict.projectDetail?.opportunities || "Opportunities"}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate max-w-50">{project.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge className="bg-blue-100 text-blue-700 capitalize">{project.projectType}</Badge>
                  <Badge variant="outline" className="capitalize">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {project.workMode}
                  </Badge>
                  {project.location && (
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      {project.location}
                    </Badge>
                  )}
                  <Badge 
                    variant={project.status === "active" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {project.status}
                  </Badge>
                </div>

                <h1 className="text-3xl font-bold text-foreground mb-4">{project.title}</h1>

                {ngo && (
                  <div className="flex items-center gap-4">
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <button className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                          <Avatar className="size-12 rounded-lg">
                            <AvatarImage src={ngo.logo || ""} alt={ngo.orgName} />
                            <AvatarFallback className="rounded-lg">
                              {ngo.logo ? null : <Building2 className="h-6 w-6 text-muted-foreground" />}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground hover:text-primary transition-colors">
                                {ngo.orgName}
                              </span>
                              {ngo.isVerified && <CheckCircle className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {ngo.isVerified ? (dict.projectDetail?.verifiedOrganization || "Verified Organization") : (dict.projectDetail?.organization || "Organization")}
                            </p>
                          </div>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80" align="start">
                        <div className="flex items-start gap-4">
                          <Avatar className="size-14 rounded-lg">
                            <AvatarImage src={ngo.logo || ""} alt={ngo.orgName} />
                            <AvatarFallback className="rounded-lg">
                              <Building2 className="h-7 w-7 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{ngo.orgName}</p>
                            {ngo.isVerified && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {ngo.description || "Nonprofit organization"}
                            </p>
                            <Button asChild variant="link" className="px-0 mt-1 text-xs h-auto">
                              <Link href={`/ngos/${project.ngoId}`}>View Profile →</Link>
                            </Button>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                )}
              </div>

              {/* Project Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {dict.projectDetail?.opportunityDescription || "Job Description"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-slate max-w-none">
                  <div className="text-foreground leading-relaxed whitespace-pre-line">
                    {stripMarkdown(project.description)}
                  </div>
                </CardContent>
              </Card>

              {/* Skills Required */}
              <Card>
                <CardHeader>
                  <CardTitle>{dict.projectDetail?.skillsRequired || "Skills Required"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {project.skillsRequired.map((skill, index) => (
                      <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                              <span className="font-medium text-foreground">
                                {getSkillName(skill.categoryId, skill.subskillId)}
                              </span>
                              <Badge 
                                variant={skill.priority === "must-have" ? "default" : "outline"}
                                className="capitalize"
                              >
                                {skill.priority.replace("-", " ")}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {skill.priority === "must-have" ? "Required skill" : "Nice to have"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {project.skillsRequired.length === 0 && (
                      <p className="text-muted-foreground italic">{dict.projectDetail?.noSkillsRequired || "No specific skills required"}</p>
                    )}
                  </div>
                  
                  {project.experienceLevel && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{dict.projectDetail?.experienceLevel || "Experience Level"}</span>
                        <Badge variant="secondary" className="capitalize">
                          {project.experienceLevel}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Causes */}
              {project.causes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{dict.projectDetail?.causes || "Causes"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {project.causes.map((cause, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-sm py-1 px-3"
                        >
                          {cause}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Project Documents */}
              {project.documents && project.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {dict.projectDetail?.opportunityDocuments || "Job Documents"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.documents.map((doc, index) => (
                        <a
                          key={index}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                                {doc.name}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {doc.type.replace("application/", "").replace("text/", "")}
                              </p>
                            </div>
                          </div>
                          <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* About the Organization */}
              {ngo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {(dict.projectDetail?.aboutOrg || "About {name}").replace("{name}", ngo.orgName || "")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="size-16 rounded-xl shrink-0">
                        <AvatarImage src={ngo.logo || ""} alt={ngo.orgName} />
                        <AvatarFallback className="rounded-xl">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-foreground leading-relaxed">
                          {ngo.description || (dict.projectDetail?.orgFallbackDesc || "{name} is a registered nonprofit organization working to make a positive impact.").replace("{name}", ngo.orgName || "")}
                        </p>
                        {ngo.causes && ngo.causes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {ngo.causes.slice(0, 3).map((cause, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {cause}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Button asChild variant="link" className="px-0 mt-2 text-primary">
                          <Link href={`/ngos/${project.ngoId}`}>
                            {dict.projectDetail?.viewOrgProfile || "View Organization Profile →"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Apply Card - Sticky */}
              <Card className="lg:sticky lg:top-24">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-0 mb-6">
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{dict.projectDetail?.timeCommitment || "Time Commitment"}</span>
                      </div>
                      <span className="font-medium text-foreground">{project.timeCommitment || (dict.projectDetail?.flexible || "Flexible")}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{dict.projectDetail?.duration || "Duration"}</span>
                      </div>
                      <span className="font-medium text-foreground">{project.duration || (dict.projectDetail?.flexible || "Flexible")}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{dict.projectDetail?.deadline || "Deadline"}</span>
                      </div>
                      <span className="font-medium text-foreground">{formatDate(project.deadline, dict.projectDetail?.flexible || "Flexible")}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span>{dict.projectDetail?.workMode || "Work Mode"}</span>
                      </div>
                      <span className="font-medium text-foreground capitalize">{project.workMode}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{dict.projectDetail?.applications || "Applications"}</span>
                      </div>
                      <span className="font-medium text-foreground">{project.applicantsCount}</span>
                    </div>
                  </div>

                  {project.status === "active" ? (
                    <ApplyButton 
                      projectId={project._id?.toString() || id} 
                      projectTitle={project.title} 
                      hasApplied={hasApplied}
                      projectDescription={project.description}
                      projectSkills={project.skillsRequired?.map((s: any) => getSkillName(s.categoryId, s.subskillId)) || []}
                      volunteerName={volunteerProfile?.name || ""}
                      volunteerSkills={volunteerProfile?.skills?.map((s: any) => s.subskillId || s.categoryId || "") || []}
                      volunteerBio={volunteerProfile?.bio || ""}
                      deadline={project.deadline}
                    />
                  ) : (
                    <Button className="w-full" disabled>
                      {project.status === "completed" ? (dict.projectDetail?.opportunityCompleted || "Job Completed") : 
                       project.status === "closed" ? (dict.projectDetail?.applicationsClosed || "Applications Closed") : 
                       (dict.projectDetail?.notAccepting || "Not Accepting Applications")}
                    </Button>
                  )}

                  <div className="flex gap-2 mt-3">
                    <SaveButton 
                      projectId={project._id?.toString() || id}
                      initialSaved={isSaved}
                    />
                    <ShareButton 
                      title={project.title}
                      description={stripMarkdown(project.description).substring(0, 150) + "..."}
                      className="flex-1 bg-transparent"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>{(dict.projectDetail?.viewedCount || "{count} people viewed this job").replace("{count}", String(project.viewsCount))}</span>
                    </div>
                  </div>
                  {project.applicantsCount > 10 && (
                    <>
                      <Separator className="my-3" />
                      <Alert variant="default" className="border-0 p-0 bg-transparent">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          High demand — {project.applicantsCount}+ applications received
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Similar Projects */}
              {similarProjects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{dict.projectDetail?.similarOpportunities || "Similar Jobs"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {similarProjects.map((p) => (
                      <Link
                        key={p._id?.toString()}
                        href={`/projects/${p._id?.toString()}`}
                        className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium text-foreground text-sm mb-1 line-clamp-2">{p.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">{p.projectType}</Badge>
                          <span className="text-xs text-muted-foreground">{p.timeCommitment}</span>
                        </div>
                      </Link>
                    ))}
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

// ── External/Partner Opportunity View ──
/**
 * On-demand enrichment: if the stored description is thin (card text only),
 * fetch the actual source page, extract the full job description, update DB, and return enriched data.
 */
async function enrichIfNeeded(opportunity: any): Promise<any> {
  // API-sourced jobs already have full content — skip enrichment
  if (opportunity.sourceplatform === "reliefweb-api" || opportunity.sourceplatform === "idealist-api") return opportunity

  const desc = opportunity.description || ""
  const isThin = desc.length < 500 || desc === opportunity.title || desc === opportunity.shortDescription

  if (!isThin || !opportunity.sourceUrl) return opportunity

  try {
    const html = await fetchPage(opportunity.sourceUrl, 1)
    const baseUrl = new URL(opportunity.sourceUrl).origin
    const content = extractPageContent(html, baseUrl)

    if (!content.description || content.description.length <= desc.length) return opportunity

    // Build enrichment payload
    const enriched: Record<string, any> = {}
    enriched.description = content.description.slice(0, 25000)
    enriched.shortDescription = content.description.slice(0, 280)
    if (content.organization && content.organization.length > 2) enriched.organization = content.organization
    if (content.organizationUrl) enriched.organizationUrl = content.organizationUrl
    if (content.location) enriched.location = content.location
    if (content.salary) enriched.salary = content.salary
    if (content.duration) enriched.duration = content.duration
    if (content.experienceLevel) enriched.experienceLevel = content.experienceLevel
    if (content.deadline) {
      const d = new Date(content.deadline)
      if (!isNaN(d.getTime())) enriched.deadline = d
    }
    if (content.postedDate) {
      const d = new Date(content.postedDate)
      if (!isNaN(d.getTime())) enriched.postedDate = d
    }

    // Persist enriched data for future views
    await externalOpportunitiesDb.enrich(
      opportunity.sourceplatform,
      opportunity.externalId,
      enriched
    )

    return { ...opportunity, ...enriched }
  } catch {
    return opportunity
  }
}

function ExternalOpportunityView({ opportunity, lang, dict }: { opportunity: any; lang: string; dict: any }) {
  const getInitials = (name: string) => name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <ScrollProgress className="top-0" />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">{dict.projectDetail?.home || "Home"}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects">{dict.projectDetail?.opportunities || "Opportunities"}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate max-w-50">{opportunity.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {opportunity.workMode && (
                    <Badge variant="outline" className="capitalize">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {opportunity.workMode}
                    </Badge>
                  )}
                  {opportunity.location && (
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      {opportunity.location}
                    </Badge>
                  )}
                  {opportunity.compensationType && (
                    <Badge variant="outline" className="capitalize">{opportunity.compensationType}</Badge>
                  )}
                  {opportunity.experienceLevel && (
                    <Badge variant="secondary" className="capitalize">{opportunity.experienceLevel}</Badge>
                  )}

                </div>

                <h1 className="text-3xl font-bold text-foreground mb-4">{opportunity.title}</h1>

                {/* Organization */}
                <div className="flex items-center gap-4">
                  <Avatar className="size-12 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                      {getInitials(opportunity.organization || "O")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold text-foreground">{opportunity.organization}</span>
                    <p className="text-sm text-muted-foreground">
                      {dict.projectDetail?.organization || "Organization"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {dict.projectDetail?.opportunityDescription || "Job Description"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                  {opportunity.bodyHtml ? (
                    <div
                      className="text-foreground leading-relaxed text-[15px]"
                      dangerouslySetInnerHTML={{ __html: opportunity.bodyHtml }}
                    />
                  ) : (
                    <div className="text-foreground leading-relaxed whitespace-pre-line text-[15px]">
                      {opportunity.description && opportunity.description.length > 50
                        ? opportunity.description
                        : opportunity.shortDescription || opportunity.title}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* How to Apply (ReliefWeb API jobs) */}
              {opportunity.howToApplyHtml && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      {dict.projectDetail?.howToApply || "How to Apply"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-slate dark:prose-invert max-w-none text-foreground leading-relaxed text-[15px]"
                      dangerouslySetInnerHTML={{ __html: opportunity.howToApplyHtml }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {opportunity.skillsRequired && opportunity.skillsRequired.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{dict.projectDetail?.skillsRequired || "Skills Required"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skillsRequired.map((skill: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                          {typeof skill === "string" ? skill : skill.subskillId || skill.categoryId}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Causes */}
              {opportunity.causes && opportunity.causes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{dict.projectDetail?.causes || "Causes"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.causes.map((cause: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-sm py-1 px-3">{cause}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* About Organization */}
              {opportunity.organization && opportunity.organization !== "Organization" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {(dict.projectDetail?.aboutOrg || "About {name}").replace("{name}", opportunity.organization || "")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="size-16 rounded-xl shrink-0">
                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold text-lg">
                          {getInitials(opportunity.organization || "O")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground">{opportunity.organization}</p>
                        {opportunity.organizationUrl && (
                          <a href={opportunity.organizationUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Visit organization website
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Apply Card - Sticky */}
              <Card className="lg:sticky lg:top-24">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-0 mb-6">
                    {opportunity.workMode && (
                      <>
                        <div className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            <span>{dict.projectDetail?.workMode || "Work Mode"}</span>
                          </div>
                          <span className="font-medium text-foreground capitalize">{opportunity.workMode}</span>
                        </div>
                        <Separator />
                      </>
                    )}
                    {opportunity.location && (
                      <>
                        <div className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{dict.projectDetail?.location || "Location"}</span>
                          </div>
                          <span className="font-medium text-foreground">{opportunity.location}</span>
                        </div>
                        <Separator />
                      </>
                    )}
                    {opportunity.timeCommitment && (
                      <>
                        <div className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{dict.projectDetail?.timeCommitment || "Time Commitment"}</span>
                          </div>
                          <span className="font-medium text-foreground">{opportunity.timeCommitment}</span>
                        </div>
                        <Separator />
                      </>
                    )}
                    {opportunity.deadline && (
                      <>
                        <div className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{dict.projectDetail?.deadline || "Deadline"}</span>
                          </div>
                          <span className="font-medium text-foreground">{formatDate(opportunity.deadline)}</span>
                        </div>
                        <Separator />
                      </>
                    )}
                    {opportunity.compensationType && (
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{dict.projectDetail?.compensation || "Compensation"}</span>
                        </div>
                        <span className="font-medium text-foreground capitalize">
                          {opportunity.compensationType}{opportunity.salary ? ` — ${opportunity.salary}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Apply Button — redirects to source */}
                  <Button asChild className="w-full bg-primary hover:bg-primary/90" size="lg">
                    <a href={opportunity.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {dict.projectDetail?.applyNow || "Apply Now"}
                    </a>
                  </Button>

                  <div className="flex gap-2 mt-3">
                    <ShareButton
                      title={opportunity.title}
                      description={opportunity.shortDescription || opportunity.title}
                      className="flex-1 bg-transparent"
                    />
                  </div>
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
