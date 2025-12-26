import { Card, CardContent } from "@/components/ui/card"
import { getAllNGOs, getAdminStats } from "@/lib/actions"
import { NGOsSearchableList } from "@/components/admin/ngos-searchable-list"

export default async function AdminNGOsPage() {
  const stats = await getAdminStats()
  const { data: ngos, total } = await getAllNGOs(1, 100)
  
  // Calculate stats from real data
  const verifiedCount = ngos.filter(n => n.isVerified).length
  const pendingCount = ngos.filter(n => !n.isVerified).length
  const premiumCount = ngos.filter(n => n.subscriptionPlan && n.subscriptionPlan !== "free").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Manage NGOs</h1>
        <p className="text-muted-foreground">
          View and manage all NGO profiles
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-sm text-muted-foreground">Total NGOs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
            <p className="text-sm text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Pending Verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{premiumCount}</p>
            <p className="text-sm text-muted-foreground">Premium Subscribers</p>
          </CardContent>
        </Card>
      </div>

      {/* Searchable NGOs List */}
      <NGOsSearchableList 
        ngos={ngos} 
        title="All NGOs"
      />
    </div>
  )
}
