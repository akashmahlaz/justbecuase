"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Eye, MoreHorizontal, MapPin, CheckCircle, XCircle, Ban } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { UserActions } from "@/components/admin/user-actions"

interface Volunteer {
  userId: string
  name?: string
  phone?: string
  bio?: string
  avatar?: string
  city?: string
  country?: string
  location?: string
  volunteerType?: string
  skills?: { subskillId?: string; skillId?: string }[] | string[]
  isVerified?: boolean
  isActive?: boolean
  isBanned?: boolean
  createdAt?: string | Date
}

interface VolunteersSearchableListProps {
  volunteers: Volunteer[]
  title: string
}

export function VolunteersSearchableList({ volunteers, title }: VolunteersSearchableListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending" | "banned">("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Get unique volunteer types
  const volunteerTypes = useMemo(() => {
    const types = new Set(volunteers.map(v => v.volunteerType || "free").filter(Boolean))
    return Array.from(types)
  }, [volunteers])

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((volunteer) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const name = volunteer.name || volunteer.bio?.slice(0, 30) || ""
      const location = volunteer.location || `${volunteer.city || ""} ${volunteer.country || ""}`
      const matchesSearch = !searchQuery || 
        name.toLowerCase().includes(searchLower) ||
        (volunteer.phone && volunteer.phone.toLowerCase().includes(searchLower)) ||
        location.toLowerCase().includes(searchLower)

      // Status filter
      let matchesStatus = true
      if (statusFilter === "verified") {
        matchesStatus = volunteer.isVerified === true
      } else if (statusFilter === "pending") {
        matchesStatus = volunteer.isVerified !== true
      } else if (statusFilter === "banned") {
        matchesStatus = volunteer.isBanned === true
      }

      // Type filter
      const volType = volunteer.volunteerType || "free"
      const matchesType = typeFilter === "all" || volType === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [volunteers, searchQuery, statusFilter, typeFilter])

  const handleExport = () => {
    // Export to CSV
    const headers = ["Name", "Phone", "Location", "Type", "Verified", "Status", "Joined"]
    const rows = filteredVolunteers.map(volunteer => [
      volunteer.name || volunteer.bio?.slice(0, 30) || "Unnamed",
      volunteer.phone || "",
      `${volunteer.city || ""}, ${volunteer.country || ""}`,
      volunteer.volunteerType || "free",
      volunteer.isVerified ? "Yes" : "No",
      volunteer.isActive !== false ? "Active" : "Inactive",
      volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString() : ""
    ])
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `volunteers-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Helper to display skills
  const getSkillDisplay = (skill: { subskillId?: string; skillId?: string } | string) => {
    if (typeof skill === "string") return skill
    return skill.subskillId || skill.skillId || "Unknown"
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
                placeholder="Search by name, phone, or location..." 
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
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {volunteerTypes.map(type => (
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

      {/* Volunteers Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{title} ({filteredVolunteers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVolunteers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Volunteer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Skills</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVolunteers.map((volunteer) => {
                    const name = volunteer.name || volunteer.bio?.slice(0, 20) || "Volunteer"
                    const skills = volunteer.skills || []
                    return (
                      <tr key={volunteer.userId} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium overflow-hidden">
                              {volunteer.avatar ? (
                                <img src={volunteer.avatar} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{name}</p>
                              <p className="text-sm text-muted-foreground">{volunteer.phone || "No phone"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {volunteer.city || "N/A"}, {volunteer.country || "N/A"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={volunteer.volunteerType === "free" ? "default" : "secondary"}
                          >
                            {volunteer.volunteerType || "free"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1 flex-wrap">
                            {skills.slice(0, 2).map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {getSkillDisplay(skill)}
                              </Badge>
                            ))}
                            {skills.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{skills.length - 2}
                              </Badge>
                            )}
                            {skills.length === 0 && (
                              <span className="text-xs text-muted-foreground">No skills</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {volunteer.isBanned ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <Ban className="h-3 w-3" />
                                Banned
                              </Badge>
                            ) : volunteer.isVerified ? (
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
                            {volunteer.isActive === false && !volunteer.isBanned && (
                              <Badge variant="outline" className="text-yellow-600">Inactive</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <UserActions
                            userId={volunteer.userId}
                            userName={name}
                            userType="volunteer"
                            isVerified={volunteer.isVerified || false}
                            isActive={volunteer.isActive !== false}
                            isBanned={volunteer.isBanned || false}
                            currentRole="volunteer"
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
              No volunteers found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
