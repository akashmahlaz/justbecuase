"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getBanRecords } from "@/lib/actions"
import { Ban, Loader2, User, Building2 } from "lucide-react"
import type { BanRecord } from "@/lib/types"

export default function AdminBansPage() {
  const [records, setRecords] = useState<BanRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecords()
  }, [])

  async function loadRecords() {
    setLoading(true)
    const result = await getBanRecords()
    if (result.success && result.data) {
      setRecords(result.data)
    }
    setLoading(false)
  }

  const activeCount = records.filter(r => r.isActive).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Ban History</h1>
        <p className="text-muted-foreground">
          View and manage banned users
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Currently Banned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Ban className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{records.length}</p>
              <p className="text-sm text-muted-foreground">Total Ban Records</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {records.length - activeCount}
              </p>
              <p className="text-sm text-muted-foreground">Unbanned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ban Records List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">All Ban Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Reason</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Banned At</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Unbanned At</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id?.toString()} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {record.userType === "volunteer" ? (
                              <User className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium text-foreground text-sm truncate">
                            {record.userId.substring(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {record.userType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                        {record.reason}
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={record.isActive ? "destructive" : "secondary"}
                        >
                          {record.isActive ? "Banned" : "Unbanned"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(record.bannedAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {record.unbannedAt 
                          ? new Date(record.unbannedAt).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "-"
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No ban records found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ban records will appear here when users are banned
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
