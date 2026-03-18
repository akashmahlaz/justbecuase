import { Suspense } from "react"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getMyApplications } from "@/lib/actions"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  FileText,
  Eye,
} from "lucide-react"

export default async function VolunteerApplicationsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Role verification: Ensure user is a volunteer
  if (session.user.role !== "volunteer") {
    if (session.user.role === "ngo") {
      redirect("/ngo/dashboard")
    } else if (session.user.role === "admin") {
      redirect("/admin")
    } else {
      redirect("/auth/role-select")
    }
  }

  // Redirect to onboarding if not completed
  if (!session.user.isOnboarded) {
    redirect("/volunteer/onboarding")
  }

  return (
    <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{dict.volunteer?.applications?.title || "My Applications"}</h1>
            <p className="text-muted-foreground">
              {dict.volunteer?.applications?.subtitle || "Track the status of your impact agent applications"}
            </p>
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">{dict.volunteer?.common?.all || "All"}</TabsTrigger>
              <TabsTrigger value="pending">{dict.volunteer?.common?.pending || "Pending"}</TabsTrigger>
              <TabsTrigger value="shortlisted">{dict.volunteer?.common?.shortlisted || "Shortlisted"}</TabsTrigger>
              <TabsTrigger value="accepted">{dict.volunteer?.common?.accepted || "Accepted"}</TabsTrigger>
              <TabsTrigger value="rejected">{dict.volunteer?.common?.rejected || "Rejected"}</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Suspense fallback={<ApplicationsSkeleton />}>
                <ApplicationsList dict={dict} />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="pending">
              <Suspense fallback={<ApplicationsSkeleton />}>
                <ApplicationsList filter="pending" dict={dict} />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="shortlisted">
              <Suspense fallback={<ApplicationsSkeleton />}>
                <ApplicationsList filter="shortlisted" dict={dict} />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="accepted">
              <Suspense fallback={<ApplicationsSkeleton />}>
                <ApplicationsList filter="accepted" dict={dict} />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="rejected">
              <Suspense fallback={<ApplicationsSkeleton />}>
                <ApplicationsList filter="rejected" dict={dict} />
              </Suspense>
            </TabsContent>
          </Tabs>
    </main>
  )
}

async function ApplicationsList({ filter, dict }: { filter?: string; dict: any }) {
  const applications = await getMyApplications()

  const filteredApplications = filter
    ? applications.filter((a) => a.status === filter)
    : applications

  if (filteredApplications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{dict.volunteer?.applications?.noApplications || "No applications found"}</p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/volunteer/opportunities">{dict.volunteer?.common?.browseOpportunities || "Browse Opportunities"}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    shortlisted: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-gray-100 text-gray-700",
  }

  return (
    <div className="space-y-4">
      {filteredApplications.map((application) => (
        <Card key={application._id?.toString()}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{dict.volunteer?.applications?.applicationNumber || "Application #"}{application._id?.toString().slice(-6)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {dict.volunteer?.applications?.opportunityId || "Opportunity ID:"} {application.projectId.slice(-8)}
                    </p>
                  </div>
                </div>
                
                {application.coverMessage && (
                  <p className="text-sm text-muted-foreground line-clamp-2 pl-13">
                    "{application.coverMessage}"
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {dict.volunteer?.applications?.applied || "Applied"} {new Date(application.appliedAt).toLocaleDateString()}
                  </span>
                  {application.reviewedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dict.volunteer?.applications?.reviewed || "Reviewed"} {new Date(application.reviewedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={statusColors[application.status]}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${application.projectId}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    {dict.volunteer?.applications?.viewOpportunity || "View Opportunity"}
                  </Link>
                </Button>
              </div>
            </div>

            {application.ngoNotes && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-1">{dict.volunteer?.applications?.feedbackFromNgo || "Feedback from NGO:"}</p>
                <p className="text-sm text-muted-foreground">{application.ngoNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ApplicationsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-24 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
