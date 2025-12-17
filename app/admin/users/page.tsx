import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getAdminStats, getAllVolunteers, getAllNGOs } from "@/lib/actions"
import { UserActions } from "@/components/admin/user-actions"
import {
  Search,
  Filter,
  Users,
  Heart,
  Building2,
  Shield,
  User,
} from "lucide-react"
import Link from "next/link"

export default async function AdminUsersPage() {
  // Fetch real data
  const stats = await getAdminStats()
  const volunteersData = await getAllVolunteers(1, 10)
  const ngosData = await getAllNGOs(1, 10)
  
  // Combine into a simple users list
  const allUsers = [
    ...volunteersData.data.map(v => ({
      id: v.userId,
      name: v.name || "Unnamed Volunteer",
      email: v.phone || "No email",
      role: "volunteer" as const,
      avatar: v.avatar,
      createdAt: v.createdAt,
      isVerified: v.isVerified,
      isActive: v.isActive !== false,
      isBanned: (v as any).isBanned === true,
    })),
    ...ngosData.data.map(n => ({
      id: n.userId,
      name: n.organizationName || n.orgName || "Unnamed NGO",
      email: n.contactEmail || "No email",
      role: "ngo" as const,
      avatar: n.logo,
      createdAt: n.createdAt,
      isVerified: n.isVerified,
      isActive: n.isActive !== false,
      isBanned: (n as any).isBanned === true,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">All Users</h1>
          <p className="text-muted-foreground">
            Manage all registered users on the platform
          </p>
        </div>
      </div>

      {/* User Type Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.totalVolunteers + stats.totalNGOs}
              </p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Heart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalVolunteers}</p>
              <p className="text-sm text-muted-foreground">Volunteers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalNGOs}</p>
              <p className="text-sm text-muted-foreground">NGOs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">1</p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <select className="border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">All Roles</option>
                <option value="volunteer">Volunteers</option>
                <option value="ngo">NGOs</option>
                <option value="admin">Admins</option>
              </select>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Registered Users ({allUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={user.role === "volunteer" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={user.isVerified ? "default" : "outline"}
                            className={user.isVerified ? "bg-green-100 text-green-700 w-fit" : "w-fit"}
                          >
                            {user.isVerified ? "Verified" : "Pending"}
                          </Badge>
                          {!user.isActive && (
                            <Badge variant="destructive" className="w-fit">
                              Suspended
                            </Badge>
                          )}
                          {user.isBanned && (
                            <Badge variant="destructive" className="w-fit bg-red-600">
                              Banned
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <UserActions
                          userId={user.id}
                          userName={user.name}
                          userType={user.role}
                          isVerified={user.isVerified}
                          isActive={user.isActive}
                          isBanned={user.isBanned}
                          currentRole={user.role}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Users will appear here when they sign up
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
