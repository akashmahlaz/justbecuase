"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

interface ReportsGeneratorProps {
  volunteers: any[]
  ngos: any[]
  projects: any[]
  analytics: any
}

export function ReportsGenerator({ volunteers, ngos, projects, analytics }: ReportsGeneratorProps) {
  const [generating, setGenerating] = useState<string | null>(null)

  const generateReport = async (reportType: string) => {
    setGenerating(reportType)
    try {
      let csvContent = ""
      let fileName = ""
      
      switch (reportType) {
        case "user-registration":
          // Generate user registration report
          const allUsers = [
            ...volunteers.map(v => ({
              type: "Volunteer",
              name: v.name || v.bio?.slice(0, 30) || "Unnamed",
              contact: v.phone || "N/A",
              location: `${v.city || ""}, ${v.country || ""}`,
              verified: v.isVerified ? "Yes" : "No",
              createdAt: v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "N/A"
            })),
            ...ngos.map(n => ({
              type: "NGO",
              name: n.orgName || n.organizationName || "Unnamed",
              contact: n.contactEmail || "N/A",
              location: `${n.city || ""}, ${n.country || ""}`,
              verified: n.isVerified ? "Yes" : "No",
              createdAt: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "N/A"
            }))
          ]
          
          csvContent = [
            ["Type", "Name", "Contact", "Location", "Verified", "Joined"].join(","),
            ...allUsers.map(u => [u.type, u.name, u.contact, u.location, u.verified, u.createdAt].map(c => `"${c}"`).join(","))
          ].join("\n")
          fileName = "user-registration-report"
          break
          
        case "ngo-activity":
          // Generate NGO activity report
          csvContent = [
            ["Organization", "Email", "Location", "Subscription", "Projects Posted", "Projects Completed", "Verified"].join(","),
            ...ngos.map(n => [
              n.orgName || n.organizationName || "Unnamed",
              n.contactEmail || "N/A",
              `${n.city || ""}, ${n.country || ""}`,
              n.subscriptionTier || n.subscriptionPlan || "free",
              n.projectsPosted || 0,
              n.projectsCompleted || 0,
              n.isVerified ? "Yes" : "No"
            ].map(c => `"${c}"`).join(","))
          ].join("\n")
          fileName = "ngo-activity-report"
          break
          
        case "volunteer-activity":
          // Generate volunteer activity report
          csvContent = [
            ["Name", "Phone", "Location", "Type", "Skills", "Verified", "Status"].join(","),
            ...volunteers.map(v => [
              v.name || v.bio?.slice(0, 30) || "Unnamed",
              v.phone || "N/A",
              `${v.city || ""}, ${v.country || ""}`,
              v.volunteerType || "free",
              Array.isArray(v.skills) ? v.skills.length : 0,
              v.isVerified ? "Yes" : "No",
              v.isActive !== false ? "Active" : "Inactive"
            ].map(c => `"${c}"`).join(","))
          ].join("\n")
          fileName = "volunteer-activity-report"
          break
          
        case "revenue":
          // Generate revenue report placeholder
          csvContent = [
            ["Date", "Total Revenue", "Profile Unlocks", "Subscriptions"].join(","),
            [new Date().toLocaleDateString(), "₹0", "0", "0"].join(",")
          ].join("\n")
          fileName = "revenue-report"
          break
          
        case "matching":
          // Generate matching report
          csvContent = [
            "Metric,Value",
            `Total Applications,${analytics.totalApplications}`,
            `Completed Projects,${analytics.completedProjects}`,
            `Active Projects,${analytics.activeProjects}`,
            `Match Rate,${analytics.totalApplications > 0 ? Math.round((analytics.completedProjects / analytics.totalApplications) * 100) : 0}%`
          ].join("\n")
          fileName = "matching-report"
          break
          
        case "platform-health":
          // Generate platform health report
          csvContent = [
            "Metric,Value",
            `Total Volunteers,${volunteers.length}`,
            `Total NGOs,${ngos.length}`,
            `Total Projects,${projects.length}`,
            `Active Projects,${analytics.activeProjects}`,
            `Completed Projects,${analytics.completedProjects}`,
            `Total Applications,${analytics.totalApplications}`,
            `Verified Volunteers,${volunteers.filter((v: any) => v.isVerified).length}`,
            `Verified NGOs,${ngos.filter((n: any) => n.isVerified).length}`
          ].join("\n")
          fileName = "platform-health-report"
          break
      }
      
      // Download the CSV
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${fileName}-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success("Report generated successfully!")
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Failed to generate report")
    } finally {
      setGenerating(null)
    }
  }

  const reports = [
    { id: "user-registration", title: "User Registration Report", description: "All user signups with details" },
    { id: "ngo-activity", title: "NGO Activity Report", description: "NGO projects and engagement" },
    { id: "volunteer-activity", title: "Volunteer Activity Report", description: "Volunteer applications and matches" },
    { id: "revenue", title: "Revenue Report", description: "All payments and transactions" },
    { id: "matching", title: "Matching Report", description: "Skill matching statistics" },
    { id: "platform-health", title: "Platform Health Report", description: "Overall platform metrics" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Available Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 border rounded-lg hover:border-primary transition-colors"
            >
              <h4 className="font-medium text-foreground mb-1">{report.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => generateReport(report.id)}
                disabled={generating !== null}
              >
                {generating === report.id ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-1" />
                )}
                Generate
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
