import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  IndianRupee,
  Download,
  TrendingUp,
  CreditCard,
  RefreshCcw,
  CheckCircle,
} from "lucide-react"

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Payments & Transactions</h1>
          <p className="text-muted-foreground">
            View all payment transactions and revenue
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹0</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +0% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Profile Unlocks</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹0</p>
            <p className="text-xs text-muted-foreground">0 transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Subscriptions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹0</p>
            <p className="text-xs text-muted-foreground">0 active subscribers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCcw className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Refunds</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹0</p>
            <p className="text-xs text-muted-foreground">0 refunds issued</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <IndianRupee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Transactions will appear here when NGOs start unlocking profiles
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
