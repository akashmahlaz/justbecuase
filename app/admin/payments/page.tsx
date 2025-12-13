import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAllTransactions, getPaymentStats } from "@/lib/actions"
import {
  IndianRupee,
  Download,
  TrendingUp,
  CreditCard,
  RefreshCcw,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react"

export default async function AdminPaymentsPage() {
  const [stats, { data: transactions }] = await Promise.all([
    getPaymentStats(),
    getAllTransactions(),
  ])

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-700",
  }

  const statusIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle className="h-3 w-3" />,
    pending: <Clock className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
    refunded: <RefreshCcw className="h-3 w-3" />,
  }

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
            <p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {stats.completedTransactions} completed transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Profile Unlocks</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{stats.profileUnlockRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">From profile unlock payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalTransactions}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCcw className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalTransactions > 0 
                ? Math.round((stats.completedTransactions / stats.totalTransactions) * 100) 
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Of all transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <IndianRupee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Transactions will appear here when NGOs start unlocking profiles
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Transaction ID</th>
                    <th className="pb-3 font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 font-medium text-muted-foreground">Amount</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction._id?.toString()} className="border-b last:border-0">
                      <td className="py-4 font-mono text-sm">
                        {transaction._id?.toString().slice(-8)}
                      </td>
                      <td className="py-4 capitalize">
                        {transaction.type.replace("_", " ")}
                      </td>
                      <td className="py-4 font-medium">
                        ₹{transaction.amount.toLocaleString()}
                      </td>
                      <td className="py-4">
                        <Badge className={statusColors[transaction.paymentStatus] || "bg-gray-100 text-gray-700"}>
                          <span className="flex items-center gap-1">
                            {statusIcons[transaction.paymentStatus]}
                            {transaction.paymentStatus}
                          </span>
                        </Badge>
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
