"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Eye, MoreHorizontal, Globe, MapPin, CheckCircle, XCircle, Ban, Shield } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { UserActions } from "@/components/admin/user-actions"

interface NGO {
  userId: string
  orgName?: string
  organizationName?: string
  contactEmail?: string
  website?: string
  city?: string
  country?: string
  subscriptionTier?: string
  subscriptionPlan?: string
  isVerified?: boolean
  isActive?: boolean
  isBanned?: boolean
  projectsPosted?: number
  projectsCompleted?: number
  createdAt?: string | Date
  logo?: string
}

interface NGOsSearchableListProps {
  ngos: NGO[]
  title: string
}

export function NGOsSearchableList({ ngos, title }: NGOsSearchableListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending" | "banned">("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all")

  // Get unique subscription types
  const subscriptionTypes = useMemo(() => {
    const types = new Set(ngos.map(n => n.subscriptionTier || n.subscriptionPlan || "free").filter(Boolean))
    return Array.from(types)
  }, [ngos])

  const filteredNGOs = useMemo(() => {
    return ngos.filter((ngo) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const orgName = ngo.orgName || ngo.organizationName || ""
      const matchesSearch = !searchQuery || 
        orgName.toLowerCase().includes(searchLower) ||
        (ngo.contactEmail && ngo.contactEmail.toLowerCase().includes(searchLower)) ||
        (ngo.city && ngo.city.toLowerCase().includes(searchLower)) ||
        (ngo.country && ngo.country.toLowerCase().includes(searchLower))

      // Status filter
      let matchesStatus = true
      if (statusFilter === "verified") {
        matchesStatus = ngo.isVerified === true
      } else if (statusFilter === "pending") {
        matchesStatus = ngo.isVerified !== true
      } else if (statusFilter === "banned") {
        matchesStatus = ngo.isBanned === true
      }

      // Subscription filter
      const ngoSubscription = ngo.subscriptionTier || ngo.subscriptionPlan || "free"
      const matchesSubscription = subscriptionFilter === "all" || ngoSubscription === subscriptionFilter

      return matchesSearch && matchesStatus && matchesSubscription
    })
  }, [ngos, searchQuery, statusFilter, subscriptionFilter])

  const handleExport = () => {
    // Export to CSV
    const headers = ["Organization", "Email", "Location", "Subscription", "Verified", "Opportunities Posted", "Joined"]
    const rows = filteredNGOs.map(ngo => [
      ngo.orgName || ngo.organizationName || "",
      ngo.contactEmail || "",
      `${ngo.city || ""}, ${ngo.country || ""}`,
      ngo.subscriptionTier || ngo.subscriptionPlan || "free",
      ngo.isVerified ? "Yes" : "No",
      ngo.projectsPosted?.toString() || "0",
      ngo.createdAt ? new Date(ngo.createdAt instanceof Date ? ngo.createdAt : ngo.createdAt).toLocaleDateString() : ""
    ])
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ngos-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or location..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select 
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="banned">Banned</option>
              </select>
              <select 
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value)}
              >
                <option value="all">All Subscriptions</option>
                {subscriptionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NGOs Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{title} ({filteredNGOs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNGOs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organization</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Subscription</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Opportunities</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNGOs.map((ngo) => {
                    const orgName = ngo.orgName || ngo.organizationName || "Unnamed NGO"
                    return (
                      <tr key={ngo.userId} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-sm font-medium overflow-hidden">
                              {ngo.logo ? (
                                <img src={ngo.logo} alt={orgName} className="w-full h-full object-cover" />
                              ) : (
                                orgName.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{orgName}</p>
                              {ngo.website && (
                                <a 
                                  href={ngo.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary flex items-center gap-1"
                                >
                                  <Globe className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {ngo.city || "N/A"}, {ngo.country || "N/A"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={(ngo.subscriptionTier || ngo.subscriptionPlan) === "free" ? "outline" : "default"}
                          >
                            {ngo.subscriptionTier || ngo.subscriptionPlan || "free"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {ngo.projectsPosted || 0} posted / {ngo.projectsCompleted || 0} completed
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {ngo.isBanned ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <Ban className="h-3 w-3" />
                                Banned
                              </Badge>
                            ) : ngo.isVerified ? (
                              <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <UserActions
                            userId={ngo.userId}
                            userName={orgName}
                            userType="ngo"
                            isVerified={ngo.isVerified || false}
                            isActive={ngo.isActive !== false}
                            isBanned={ngo.isBanned || false}
                            currentRole="ngo"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No NGOs found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
