import { Card, CardContent } from "@/components/ui/card"
import { getAllVolunteers, getAdminStats } from "@/lib/actions"
import { VolunteersSearchableList } from "@/components/admin/volunteers-searchable-list"
import { Heart, CheckCircle, Clock, Ban } from "lucide-react"

export default async function AdminVolunteersPage() {
  const [stats, volunteersData] = await Promise.all([
    getAdminStats(),
    getAllVolunteers(1, 100)
  ])
  
  const { data: volunteers, total } = volunteersData
  
  // Calculate stats
  const verifiedCount = volunteers.filter(v => v.isVerified).length
  const pendingCount = volunteers.filter(v => !v.isVerified).length
  const bannedCount = volunteers.filter(v => (v as any).isBanned).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Manage Volunteers</h1>
        <p className="text-muted-foreground">
          View and manage all volunteer profiles
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-sm text-muted-foreground">Total Volunteers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{bannedCount}</p>
              <p className="text-sm text-muted-foreground">Banned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Searchable Volunteers List */}
      <VolunteersSearchableList 
        volunteers={volunteers} 
        title="All Volunteers"
      />
    </div>
  )
}
