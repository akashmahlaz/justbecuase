"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Download, Eye, MoreHorizontal, CheckCircle, XCircle, Clock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserActions } from "@/components/admin/user-actions"
import Link from "next/link"

interface User {
  id: string
  name: string
  email: string
  role: "volunteer" | "ngo"
  avatar?: string
  createdAt: string | Date
  isVerified?: boolean
  isActive?: boolean
  isBanned?: boolean
  location?: string
  skills?: string[]
}

interface UsersSearchableListProps {
  users: User[]
  title: string
  showRoleColumn?: boolean
  viewLinkPrefix?: string
}

export function UsersSearchableList({ 
  users, 
  title, 
  showRoleColumn = true,
  viewLinkPrefix = "/admin/users"
}: UsersSearchableListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "volunteer" | "ngo">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "verified" | "banned">("all")

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.location && user.location.toLowerCase().includes(searchLower))

      // Role filter
      const matchesRole = roleFilter === "all" || user.role === roleFilter

      // Status filter
      let matchesStatus = true
      if (statusFilter === "active") {
        matchesStatus = user.isActive !== false
      } else if (statusFilter === "verified") {
        matchesStatus = user.isVerified === true
      } else if (statusFilter === "banned") {
        matchesStatus = user.isBanned === true
      }

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const handleExport = () => {
    // Export to CSV
    const headers = ["Name", "Email", "Role", "Status", "Verified", "Joined"]
    const rows = filteredUsers.map(user => [
      user.name,
      user.email,
      user.role,
      user.isActive !== false ? "Active" : (user.isBanned ? "Banned" : "Inactive"),
      user.isVerified ? "Yes" : "No",
      new Date(user.createdAt).toLocaleDateString()
    ])
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
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
            <div className="flex gap-2">
              {showRoleColumn && (
                <select 
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                >
                  <option value="all">All Roles</option>
                  <option value="volunteer">Volunteers</option>
                  <option value="ngo">NGOs</option>
                </select>
              )}
              <select 
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="verified">Verified</option>
                <option value="banned">Banned</option>
              </select>
              <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{title} ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                    {showRoleColumn && (
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                    )}
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {user.avatar ? (
                              <img 
                                src={user.avatar} 
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-foreground">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {showRoleColumn && (
                        <td className="py-3 px-4">
                          <Badge variant={user.role === "volunteer" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {user.isBanned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : user.isActive === false ? (
                            <Badge variant="outline" className="text-yellow-600">Suspended</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">Active</Badge>
                          )}
                          {user.isVerified && (
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <UserActions
                          userId={user.id}
                          userName={user.name}
                          userType={user.role}
                          isVerified={user.isVerified || false}
                          isActive={user.isActive !== false}
                          isBanned={user.isBanned || false}
                          currentRole={user.role}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
