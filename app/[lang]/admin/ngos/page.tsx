import { Card, CardContent } from "@/components/ui/card"
import { getAllNGOs, getAdminStats } from "@/lib/actions"
import { NGOsSearchableList } from "@/components/admin/ngos-searchable-list"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"

export default async function AdminNGOsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any
  const stats = await getAdminStats()
  const { data: ngos, total } = await getAllNGOs(1, 100)
  
  // Calculate stats from real data
  const verifiedCount = ngos.filter(n => n.isVerified).length
  const pendingCount = ngos.filter(n => !n.isVerified).length
  const premiumCount = ngos.filter(n => n.subscriptionPlan && n.subscriptionPlan !== "free").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{dict.admin?.ngos?.title || "Manage NGOs"}</h1>
        <p className="text-muted-foreground">
          {dict.admin?.ngos?.subtitle || "View and manage all NGO profiles"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-sm text-muted-foreground">{dict.admin?.ngos?.totalNgos || "Total NGOs"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
            <p className="text-sm text-muted-foreground">{dict.admin?.ngos?.verified || "Verified"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">{dict.admin?.ngos?.pendingVerification || "Pending Verification"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{premiumCount}</p>
            <p className="text-sm text-muted-foreground">{dict.admin?.ngos?.premiumSubscribers || "Premium Subscribers"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Searchable NGOs List */}
      <NGOsSearchableList 
        ngos={ngos} 
        title={dict.admin?.ngos?.allNgos || "All NGOs"}
      />
    </div>
  )
}
