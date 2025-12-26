import { Card, CardContent } from "@/components/ui/card"
import { getAdminStats, getAllVolunteers, getAllNGOs } from "@/lib/actions"
import { UsersSearchableList } from "@/components/admin/users-searchable-list"
import {
  Users,
  Heart,
  Building2,
  Shield,
} from "lucide-react"

export default async function AdminUsersPage() {
  // Fetch real data - get more users for better search experience
  const stats = await getAdminStats()
  const volunteersData = await getAllVolunteers(1, 100)
  const ngosData = await getAllNGOs(1, 100)
  
  // Combine into a simple users list
  const allUsers = [
    ...volunteersData.data.map(v => ({
      id: v.userId,
      name: v.name || "Unnamed Volunteer",
      email: v.phone || "No email",
      role: "volunteer" as const,
      avatar: v.avatar,
      createdAt: v.createdAt || new Date().toISOString(),
      isVerified: v.isVerified,
      isActive: v.isActive !== false,
      isBanned: (v as any).isBanned === true,
      location: v.location,
    })),
    ...ngosData.data.map(n => ({
      id: n.userId,
      name: n.organizationName || n.orgName || "Unnamed NGO",
      email: n.contactEmail || "No email",
      role: "ngo" as const,
      avatar: n.logo,
      createdAt: n.createdAt || new Date().toISOString(),
      isVerified: n.isVerified,
      isActive: n.isActive !== false,
      isBanned: (n as any).isBanned === true,
      location: n.city,
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

      {/* Searchable Users List */}
      <UsersSearchableList 
        users={allUsers} 
        title="Registered Users"
        showRoleColumn={true}
      />
    </div>
  )
}
