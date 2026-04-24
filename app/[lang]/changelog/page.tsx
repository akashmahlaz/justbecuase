import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, Wrench, Sparkles, Clock } from "lucide-react"

export const metadata: Metadata = {
  title: "Changelog",
  description: "See what's new on JustBeCause Network. Latest features, improvements, and bug fixes for the skills-based volunteering platform.",
  openGraph: {
    title: "Changelog | JustBeCause Network",
    description: "Latest features, improvements, and updates to JustBeCause Network.",
  },
}

const changelogEntries = [
  {
    version: "1.0.0",
    date: "December 6, 2025",
    type: "release",
    changes: [
      {
        type: "feature",
        title: "Platform Launch",
        description: "Initial release of JustBeCause Network with core features for candidates and Enterprises.",
      },
      {
        type: "feature",
        title: "Better Auth Integration",
        description: "Enterprise-grade authentication with MongoDB backend and role-based access control.",
      },
      {
        type: "feature",
        title: "Onboarding Flows",
        description: "Comprehensive onboarding for both candidates and Enterprises with skills matching.",
      },
      {
        type: "feature",
        title: "7 Skills Categories",
        description: "Digital Marketing, Fundraising, Website Design, Finance, Content Creation, Communication, and Planning & Support.",
      },
      {
        type: "security",
        title: "Security Update",
        description: "Updated to Next.js 16.0.7 and React 19.2.1 to address CVE-2025-66478 critical vulnerability.",
      },
    ],
  },
  {
    version: "0.9.0",
    date: "December 5, 2025",
    type: "beta",
    changes: [
      {
        type: "feature",
        title: "Beta Testing Phase",
        description: "Closed beta with select Enterprises and candidates for platform testing.",
      },
      {
        type: "improvement",
        title: "UI/UX Refinements",
        description: "Based on beta feedback, improved navigation and user flows.",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "November 28, 2025",
    type: "alpha",
    changes: [
      {
        type: "feature",
        title: "Alpha Release",
        description: "Core platform development completed with basic matching algorithm.",
      },
      {
        type: "feature",
        title: "Dashboard Prototypes",
        description: "Initial dashboards for candidates and Enterprises.",
      },
    ],
  },
]

const getTypeIcon = (type: string) => {
  switch (type) {
    case "feature":
      return <Sparkles className="h-4 w-4 text-blue-500" />
    case "improvement":
      return <Wrench className="h-4 w-4 text-amber-500" />
    case "security":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "fix":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    default:
      return <CheckCircle className="h-4 w-4 text-muted-foreground" />
  }
}

const getTypeBadge = (type: string) => {
  switch (type) {
    case "release":
      return <Badge className="bg-green-500">Release</Badge>
    case "beta":
      return <Badge className="bg-blue-500">Beta</Badge>
    case "alpha":
      return <Badge className="bg-purple-500">Alpha</Badge>
    default:
      return <Badge variant="secondary">{type}</Badge>
  }
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">What&apos;s New</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Changelog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Track new features, improvements, and fixes to JustBeCause Network
            </p>
          </div>
        </section>

        {/* Changelog Entries */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto space-y-8">
            {changelogEntries.map((entry) => (
              <Card key={entry.version} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-2xl">v{entry.version}</CardTitle>
                        {getTypeBadge(entry.type)}
                      </div>
                      <CardDescription>{entry.date}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {entry.changes.map((change, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="mt-1">{getTypeIcon(change.type)}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">
                            {change.title}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {change.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Security Notice */}
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-red-900 dark:text-red-400">
                    Security Updates
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-red-800 dark:text-red-300 text-sm">
                  We take security seriously. All critical vulnerabilities (like CVE-2025-66478) are
                  addressed immediately. Our platform is regularly audited and updated to ensure
                  enterprise-grade security for all users.
                </p>
              </CardContent>
            </Card>
          </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
