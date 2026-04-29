import LocaleLink from "@/components/locale-link"
import { CandidateSourceLinkGenerator } from "@/components/admin/candidate-source-link-generator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCandidateSourceReport } from "@/lib/actions"
import { Building2, CheckCircle2, GraduationCap, Link2, Users } from "lucide-react"

function formatDate(value?: string | Date) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date)
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).slice(0, 3)
  if (typeof value !== "string") return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object") {
          return String((item as any).subskillId || (item as any).categoryId || "")
        }
        return ""
      })
      .filter(Boolean)
      .slice(0, 3)
  } catch {
    return []
  }
}

export default async function CandidateSourcesPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const report = await getCandidateSourceReport()
  const onboardedCount = report.candidates.filter((candidate: any) => candidate.isOnboarded).length
  const verifiedCount = report.candidates.filter((candidate: any) => candidate.isVerified).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Candidate Source Tracking</h1>
        <p className="text-muted-foreground">
          Track candidate registrations coming from college, campaign, and partner signup links.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{report.totalSources}</p>
              <p className="text-sm text-muted-foreground">Tracked Sources</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{report.totalCandidates}</p>
              <p className="text-sm text-muted-foreground">Tracked Candidates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10">
              <CheckCircle2 className="size-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{onboardedCount}</p>
              <p className="text-sm text-muted-foreground">Onboarded</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10">
              <GraduationCap className="size-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{verifiedCount}</p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CandidateSourceLinkGenerator lang={lang} />

      <Card>
        <CardHeader>
          <CardTitle>Source Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {report.summary.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
              No candidate source registrations have been tracked yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>College / Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Candidates</TableHead>
                  <TableHead>Onboarded</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Latest Activity</TableHead>
                  <TableHead>Registration Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.summary.map((source: any) => {
                  const registrationLink = `/${lang}/auth/signup?role=candidate&college=${encodeURIComponent(source.sourceCode || "")}&collegeName=${encodeURIComponent(source.sourceName || source.sourceCode || "")}`
                  return (
                    <TableRow key={source.sourceCode}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{source.sourceName || source.sourceCode}</span>
                          <span className="text-xs text-muted-foreground">{source.sourceCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{source.sourceType || "college"}</Badge>
                      </TableCell>
                      <TableCell>{source.campaign || "-"}</TableCell>
                      <TableCell>{source.totalCandidates || 0}</TableCell>
                      <TableCell>{source.onboardedCandidates || 0}</TableCell>
                      <TableCell>{source.verifiedCandidates || 0}</TableCell>
                      <TableCell>{formatDate(source.latestSignupAt || source.updatedAt || source.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Link2 className="size-3" />
                          <span className="max-w-72 truncate">{registrationLink}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Details</CardTitle>
        </CardHeader>
        <CardContent>
          {report.candidates.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
              Candidate details will appear here once tracked links are used.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Captured</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.candidates.map((candidate: any) => {
                  const skills = parseList(candidate.skills)
                  const causes = parseList(candidate.causes)
                  const location = [candidate.city, candidate.country].filter(Boolean).join(", ") || candidate.location || "-"
                  return (
                    <TableRow key={candidate._id || candidate.id || candidate.email}>
                      <TableCell>
                        <div className="flex flex-col">
                          <LocaleLink href={`/volunteers/${candidate._id || candidate.id}`} className="font-medium text-foreground hover:underline">
                            {candidate.name || "Unnamed candidate"}
                          </LocaleLink>
                          <span className="text-xs text-muted-foreground">{candidate.email || "No email"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{candidate.candidateSourceName || candidate.candidateSourceCode}</span>
                          <span className="text-xs text-muted-foreground">{candidate.candidateSourceCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>{location}</TableCell>
                      <TableCell>
                        <div className="flex max-w-72 flex-col gap-1 text-xs text-muted-foreground">
                          <span className="truncate">{candidate.headline || "No headline"}</span>
                          <span className="truncate">Skills: {skills.length ? skills.join(", ") : "-"}</span>
                          <span className="truncate">Causes: {causes.length ? causes.join(", ") : "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={candidate.isOnboarded ? "default" : "outline"}>
                            {candidate.isOnboarded ? "Onboarded" : "Not onboarded"}
                          </Badge>
                          <Badge variant={candidate.isVerified ? "secondary" : "outline"}>
                            {candidate.isVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(candidate.createdAt)}</TableCell>
                      <TableCell>{formatDate(candidate.candidateSourceCapturedAt)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}