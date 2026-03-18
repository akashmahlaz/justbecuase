"use client"

import { useState, useEffect, useCallback } from "react"
import { useDictionary } from "@/components/dictionary-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Inbox,
  Filter,
  User,
  Calendar,
  Tag,
} from "lucide-react"
import { toast } from "sonner"

interface ContactInquiry {
  _id: string
  firstName: string
  lastName: string
  email: string
  message: string
  source: "contact_page" | "pricing_contact_sales"
  status: "new" | "in-progress" | "resolved" | "closed"
  adminNotes?: string
  respondedBy?: string
  respondedAt?: string
  createdAt: string
  updatedAt: string
}

interface Stats {
  total: number
  new: number
  inProgress: number
  resolved: number
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", icon: <Inbox className="h-3 w-3" /> },
  "in-progress": { label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300", icon: <Clock className="h-3 w-3" /> },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300", icon: <CheckCircle className="h-3 w-3" /> },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <AlertCircle className="h-3 w-3" /> },
}

export default function AdminContactInquiriesPage() {
  const dict = useDictionary()
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, inProgress: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null)
  const [newStatus, setNewStatus] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [updating, setUpdating] = useState(false)

  const fetchInquiries = useCallback(async () => {
    try {
      const params = filterStatus !== "all" ? `?status=${filterStatus}` : ""
      const res = await fetch(`/api/admin/contact-inquiries${params}`)
      if (res.ok) {
        const data = await res.json()
        setInquiries(data.inquiries || [])
        setStats(data.stats || { total: 0, new: 0, inProgress: 0, resolved: 0 })
      }
    } catch {
      toast.error("Failed to load inquiries")
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const handleUpdateStatus = async () => {
    if (!selectedInquiry || !newStatus) return
    setUpdating(true)
    try {
      const res = await fetch("/api/admin/contact-inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedInquiry._id,
          status: newStatus,
          adminNotes: adminNotes.trim() || undefined,
        }),
      })
      if (res.ok) {
        toast.success("Inquiry updated")
        setSelectedInquiry(null)
        fetchInquiries()
      } else {
        toast.error("Failed to update inquiry")
      }
    } catch {
      toast.error("Failed to update inquiry")
    } finally {
      setUpdating(false)
    }
  }

  const openDetail = (inquiry: ContactInquiry) => {
    setSelectedInquiry(inquiry)
    setNewStatus(inquiry.status)
    setAdminNotes(inquiry.adminNotes || "")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Contact Inquiries</h1>
        <p className="text-muted-foreground">Manage contact form and sales inquiry submissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">New</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.new}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Resolved</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Inquiries</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : inquiries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No inquiries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => {
            const sc = statusConfig[inquiry.status] || statusConfig.new
            return (
              <Card
                key={inquiry._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(inquiry)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{inquiry.firstName} {inquiry.lastName}</span>
                        <Badge className={`${sc.color} flex items-center gap-1 text-xs`}>
                          {sc.icon} {sc.label}
                        </Badge>
                        {inquiry.source === "pricing_contact_sales" && (
                          <Badge variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" /> Sales
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{inquiry.email}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{inquiry.message}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inquiry from {selectedInquiry?.firstName} {selectedInquiry?.lastName}</DialogTitle>
            <DialogDescription>
              {selectedInquiry?.email} &middot; {selectedInquiry?.createdAt && new Date(selectedInquiry.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedInquiry?.source === "pricing_contact_sales" && (
              <Badge variant="outline"><Tag className="h-3 w-3 mr-1" /> Sales Inquiry (from Pricing Page)</Badge>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Message</label>
              <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">{selectedInquiry?.message}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedInquiry?.respondedBy && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last updated by</label>
                  <p className="mt-1 text-sm">{selectedInquiry.respondedBy}</p>
                  {selectedInquiry.respondedAt && (
                    <p className="text-xs text-muted-foreground">{new Date(selectedInquiry.respondedAt).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Admin Notes</label>
              <Textarea
                className="mt-1"
                placeholder="Add internal notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                maxLength={2000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInquiry(null)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
