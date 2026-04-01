import Link from "next/link"
import { notFound } from "next/navigation"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ShareButton } from "@/components/share-button"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { fetchPage, extractPageContent } from "@/lib/scraper/text-extractor"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import {
  Clock,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  FileText,
  Globe,
  ArrowLeft,
  Tag,
  GraduationCap,
  DollarSign,
} from "lucide-react"

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function formatDate(date?: Date | string, fallback = "Not specified"): string {
  if (!date) return fallback
  const d = new Date(date)
  if (isNaN(d.getTime())) return fallback
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
}


export default async function ExternalOpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}) {
  const { id, lang } = await params
  const dict = await getDictionary(lang as Locale) as any

  const raw = await externalOpportunitiesDb.findById(id)
  if (!raw) {
    notFound()
  }

  // On-demand enrichment: if the stored description is thin, fetch full content from source
  const opportunity = await enrichIfNeeded(raw)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/${lang}/projects`}>
                    {dict.projectDetail?.backToOpportunities || "Opportunities"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate max-w-xs">
                    {opportunity.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
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
                    <Badge variant="outline" className="capitalize">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {opportunity.compensationType}
                    </Badge>
                  )}
                  {opportunity.experienceLevel && (
                    <Badge variant="secondary" className="capitalize">
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {opportunity.experienceLevel}
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl font-bold text-foreground mb-4">{opportunity.title}</h1>

                {/* Organization */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 rounded-lg">
                    {opportunity.organizationLogo ? (
                      <img
                        src={opportunity.organizationLogo}
                        alt={opportunity.organization}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                      {getInitials(opportunity.organization || "O")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{opportunity.organization}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {dict.projectDetail?.organization || "Organization"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {dict.projectDetail?.opportunityDescription || "Opportunity Description"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {opportunity.bodyHtml ? (
                    <div
                      className="prose prose-slate dark:prose-invert max-w-none text-foreground leading-relaxed text-[15px]"
                      dangerouslySetInnerHTML={{ __html: opportunity.bodyHtml }}
                    />
                  ) : (
                    <div className="prose prose-slate dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-line text-[15px]">
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
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      {dict.projectDetail?.skillsRequired || "Skills Required"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skillsRequired.map((skill: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                          {skill.subskillId || skill.categoryId || skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skill Tags (raw from source) */}
              {opportunity.skillTags && opportunity.skillTags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{dict.projectDetail?.tags || "Tags"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skillTags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
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
                        <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                          {cause}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* About the Organization */}
              {opportunity.organization && opportunity.organization !== "Organization" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      About {opportunity.organization}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 rounded-xl shrink-0">
                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold text-lg">
                          {getInitials(opportunity.organization || "O")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground">{opportunity.organization}</p>
                        {opportunity.organizationUrl && (
                          <a
                            href={opportunity.organizationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" />
                            Visit organization website
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
              <Card className="lg:sticky lg:top-24 border-primary/20">
                <CardContent className="p-6">
                  <div className="space-y-4 mb-6">
                    {opportunity.workMode && (
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-4 w-4" />
                          <span>Work Mode</span>
                        </div>
                        <span className="font-medium text-foreground capitalize">{opportunity.workMode}</span>
                      </div>
                    )}
                    {opportunity.location && (
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>Location</span>
                        </div>
                        <span className="font-medium text-foreground">{opportunity.location}</span>
                      </div>
                    )}
                    {opportunity.timeCommitment && (
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Time Commitment</span>
                        </div>
                        <span className="font-medium text-foreground">{opportunity.timeCommitment}</span>
                      </div>
                    )}
                    {opportunity.duration && (
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Duration</span>
                        </div>
                        <span className="font-medium text-foreground">{opportunity.duration}</span>
                      </div>
                    )}
                    {opportunity.deadline && (
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Deadline</span>
                        </div>
                        <span className="font-medium text-foreground">{formatDate(opportunity.deadline)}</span>
                      </div>
                    )}
                    {opportunity.compensationType && (
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>Compensation</span>
                        </div>
                        <span className="font-medium text-foreground capitalize">
                          {opportunity.compensationType}
                          {opportunity.salary ? ` — ${opportunity.salary}` : ""}
                        </span>
                      </div>
                    )}

                  </div>

                  {/* Apply Button — redirects to source */}
                  <Button asChild className="w-full" size="lg">
                    <a
                      href={opportunity.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {dict.projectDetail?.applyNow || "Apply Now"}
                    </a>
                  </Button>

                  <div className="flex gap-2 mt-4">
                    <ShareButton
                      title={opportunity.title}
                      description={opportunity.shortDescription || opportunity.title}
                      className="flex-1 bg-transparent"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Posted Info */}
              <Card>
                <CardContent className="p-6 space-y-2 text-sm text-muted-foreground">
                  {opportunity.postedDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Posted: {formatDate(opportunity.postedDate)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Last updated: {formatDate(opportunity.updatedAt)}</span>
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
