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
import { getNGOById, getActiveProjects, getFollowStats } from "@/lib/actions"
import { stripMarkdown } from "@/lib/strip-markdown"
import { skillCategories } from "@/lib/skills-data"
import { 
  MapPin, 
  CheckCircle, 
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}): Promise<Metadata> {
  const { id, lang } = await params
  const ngo = await getNGOById(id)

  if (!ngo) {
    return { title: "NGO Not Found" }
  }

  const title = ngo.orgName
  const description = (ngo.description || `${ngo.orgName} on JustBeCause Network`).slice(0, 160)

  return {
    title,
    description,
    openGraph: {
      title: `${title} | JustBeCause Network`,
      description,
      url: absoluteUrl(`/${lang}/ngos/${id}`),
      type: "profile",
      images: ngo.logo ? [{ url: ngo.logo, width: 400, height: 400, alt: ngo.orgName }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${title} | JustBeCause Network`,
      description,
      site: "@justbecausenet",
      images: ngo.logo ? [ngo.logo] : undefined,
    },
    alternates: {
      canonical: absoluteUrl(`/${lang}/ngos/${id}`),
      languages: Object.fromEntries(
        i18n.locales.map((l) => [l, absoluteUrl(`/${l}/ngos/${id}`)])
      ),
    },
  }
}

export default async function NGOProfilePage({ params }: { params: Promise<{ id: string; lang: string }> }) {
  const { lang, id } = await params
  const dict = await getDictionary(lang as Locale) as any;
  
  // Get NGO profile from database
  const ngo = await getNGOById(id)
  
  if (!ngo) {
    notFound()
  }
  
  // Get NGO's projects
  const allProjects = await getActiveProjects(20)
  const ngoProjects = allProjects.filter(p => p.ngoId === id)
  
  // Check if current user is following this NGO + get stats
  const followStatsResult = await getFollowStats(id)
  const followStats = followStatsResult.success ? followStatsResult.data! : { followersCount: 0, followingCount: 0, isFollowing: false }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-linear-to-r from-secondary/10 to-primary/10 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-32 h-32 rounded-2xl border-4 border-background shadow-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
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
                    {(dict.ngoDetail?.projectsPosted || "{count} projects posted").replace("{count}", String(ngo.projectsPosted))}
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
              <div className="flex flex-col gap-2 min-w-[170px] w-full md:w-auto">
                <FollowButton 
                  targetId={id} 
                  targetName={ngo.orgName}
                  isFollowing={followStats.isFollowing}
                  followersCount={followStats.followersCount}
                  showCount={false}
                />
                <FollowStatsDisplay
                  userId={id}
                  followersCount={followStats.followersCount}
                  followingCount={followStats.followingCount}
                  className="justify-center"
                />
                <ShareButton
                  url={`/ngos/${id}`}
                  title={ngo.orgName}
                  description={ngo.description || (dict.ngoDetail?.shareDescription || "Discover {name} and their impactful projects on JustBeCause.").replace("{name}", ngo.orgName)}
                  variant="outline"
                  className="w-full"
                />
                {ngo.website && (
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href={ngo.website} target="_blank">
                      <Globe className="h-4 w-4 mr-2" />
                      {dict.ngoDetail?.visitWebsite || "Visit Website"}
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
                  <CardTitle>{(dict.ngoDetail?.aboutOrg || "About {name}").replace("{name}", ngo.orgName)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {ngo.description || (dict.ngoDetail?.orgFallbackDesc || "{name} is a registered nonprofit organization working to create positive change in communities.").replace("{name}", ngo.orgName)}
                  </p>
                  {ngo.mission && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">{dict.ngoDetail?.mission || "Mission"}</p>
                      <p className="text-foreground">{ngo.mission}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Open Projects */}
              {ngoProjects.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">{(dict.ngoDetail?.openProjects || "Open Projects ({count})").replace("{count}", String(ngoProjects.length))}</h2>
                    <Button asChild variant="outline" className="bg-transparent">
                      <Link href={`/projects?ngo=${id}`}>{dict.ngoDetail?.viewAll || "View All"}</Link>
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
                              {stripMarkdown(project.description)}
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
                              <span>{(dict.ngoDetail?.applicantsCount || "{count} applicants").replace("{count}", String(project.applicantsCount))}</span>
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
                    <h3 className="font-semibold text-foreground mb-2">{dict.ngoDetail?.noOpenOpportunities || "No Open Jobs"}</h3>
                    <p className="text-muted-foreground">
                      {dict.ngoDetail?.noOpenOpportunitiesDesc || "This organization doesn't have any open opportunities at the moment."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Skills They Need */}
              {ngo.typicalSkillsNeeded && ngo.typicalSkillsNeeded.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{dict.ngoDetail?.skillsLookingFor || "Skills They're Looking For"}</CardTitle>
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
                  <CardTitle>{dict.ngoDetail?.impact || "Impact"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 rounded-lg bg-primary/10">
                    <p className="text-3xl font-bold text-primary">{ngo.projectsPosted}</p>
                    <p className="text-sm text-muted-foreground">{dict.ngoDetail?.projectsPostedStat || "Projects Posted"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold text-foreground">{ngo.volunteersEngaged}</p>
                      <p className="text-xs text-muted-foreground">{dict.ngoDetail?.impactAgents || "Impact Agents"}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold text-foreground">
                        ${((ngo.volunteersEngaged || 0) * 50000).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{dict.ngoDetail?.valueCreated || "Value Created"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{dict.ngoDetail?.orgDetails || "Organization Details"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ngo.registrationNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{dict.ngoDetail?.registration || "Registration"}</span>
                      <span className="text-sm font-medium text-foreground">{ngo.registrationNumber}</span>
                    </div>
                  )}
                  {ngo.teamSize && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{dict.ngoDetail?.teamSize || "Team Size"}</span>
                      <span className="text-sm font-medium text-foreground capitalize">{ngo.teamSize}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{dict.ngoDetail?.status || "Status"}</span>
                    <Badge className={ngo.isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                      {ngo.isVerified ? (dict.ngoDetail?.verifiedBadge || "Verified") : (dict.ngoDetail?.pendingVerification || "Pending Verification")}
                    </Badge>
                  </div>
                  {ngo.createdAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{dict.ngoDetail?.memberSince || "Member Since"}</span>
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
                  <CardTitle>{dict.ngoDetail?.connect || "Connect"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ngo.website && (
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href={ngo.website} target="_blank">
                        <Globe className="h-4 w-4 mr-2" />
                        {dict.ngoDetail?.website || "Website"}
                      </Link>
                    </Button>
                  )}
                  {ngo.contactEmail && (
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href={`mailto:${ngo.contactEmail}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        {dict.ngoDetail?.email || "Email"}
                      </Link>
                    </Button>
                  )}
                  {ngo.contactPhone && (
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href={`tel:${ngo.contactPhone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        {dict.ngoDetail?.phone || "Phone"}
                      </Link>
                    </Button>
                  )}
                  {ngo.socialLinks?.linkedin && (
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href={ngo.socialLinks.linkedin} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {dict.ngoDetail?.linkedin || "LinkedIn"}
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
