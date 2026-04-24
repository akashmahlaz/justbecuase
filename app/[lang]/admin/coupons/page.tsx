"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Tag, Copy, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useDictionary } from "@/components/dictionary-provider"
import { useLocale } from "@/hooks/use-locale"

interface Coupon {
  _id: string
  code: string
  description?: string
  discountType: "percentage" | "fixed"
  discountValue: number
  maxUses: number
  usedCount: number
  maxUsesPerUser: number
  applicablePlans: string[]
  minAmount?: number
  validFrom: string
  validUntil: string
  isActive: boolean
  createdAt: string
}

const PLAN_OPTIONS = [
  { value: "ngo-pro", label: "NGO Pro" },
  { value: "volunteer-pro", label: "Impact Agent Pro" },
]

export default function AdminCouponsPage() {
  const dict = useDictionary();
  const locale = useLocale();
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 0,
    maxUses: 0,
    maxUsesPerUser: 1,
    applicablePlans: [] as string[],
    minAmount: 0,
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isActive: true,
  })

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coupons")
      const data = await res.json()
      if (data.success) {
        setCoupons(data.data)
      }
    } catch {
      toast.error(dict.admin?.coupons?.toasts?.failedToLoad || "Failed to load coupons")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      maxUses: 0,
      maxUsesPerUser: 1,
      applicablePlans: [],
      minAmount: 0,
      validFrom: new Date().toISOString().slice(0, 16),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      isActive: true,
    })
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast.error(dict.admin?.coupons?.toasts?.codeRequired || "Coupon code is required")
      return
    }
    if (formData.discountValue <= 0) {
      toast.error(dict.admin?.coupons?.toasts?.discountRequired || "Discount value must be greater than 0")
      return
    }
    if (formData.discountType === "percentage" && formData.discountValue > 100) {
      toast.error(dict.admin?.coupons?.toasts?.percentageExceeded || "Percentage discount cannot exceed 100%")
      return
    }

    setSaving(true)
    try {
      const url = editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          code: formData.code.toUpperCase().trim(),
          validFrom: new Date(formData.validFrom).toISOString(),
          validUntil: new Date(formData.validUntil).toISOString(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save coupon")
      }

      toast.success(editingId ? (dict.admin?.coupons?.toasts?.couponUpdated || "Coupon updated") : (dict.admin?.coupons?.toasts?.couponCreated || "Coupon created"))
      setDialogOpen(false)
      resetForm()
      fetchCoupons()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(dict.admin?.coupons?.toasts?.deleteConfirm || "Are you sure you want to delete this coupon?")) return
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success(dict.admin?.coupons?.toasts?.couponDeleted || "Coupon deleted")
      fetchCoupons()
    } catch {
      toast.error(dict.admin?.coupons?.toasts?.failedToDelete || "Failed to delete coupon")
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error("Failed to update")
      fetchCoupons()
    } catch {
      toast.error(dict.admin?.coupons?.toasts?.failedToToggle || "Failed to toggle coupon status")
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon._id)
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses,
      maxUsesPerUser: coupon.maxUsesPerUser,
      applicablePlans: coupon.applicablePlans,
      minAmount: coupon.minAmount || 0,
      validFrom: new Date(coupon.validFrom).toISOString().slice(0, 16),
      validUntil: new Date(coupon.validUntil).toISOString().slice(0, 16),
      isActive: coupon.isActive,
    })
    setDialogOpen(true)
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success((dict.admin?.coupons?.toasts?.copied || "Copied {code}").replace("{code}", code))
  }

  const isExpired = (date: string) => new Date(date) < new Date()

  const planLabels: Record<string, string> = {
    "ngo-pro": dict.admin?.coupons?.ngoPro || "NGO Pro",
    "volunteer-pro": dict.admin?.coupons?.agentPro || "Agent Pro",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{dict.admin?.coupons?.title || "Coupon Codes"}</h1>
          <p className="text-muted-foreground">{dict.admin?.coupons?.subtitle || "Create and manage discount coupons for subscriptions"}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {dict.admin?.coupons?.createCoupon || "Create Coupon"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? (dict.admin?.coupons?.editCoupon || "Edit Coupon") : (dict.admin?.coupons?.createCoupon || "Create Coupon")}</DialogTitle>
              <DialogDescription>
                {editingId ? (dict.admin?.coupons?.editCouponDescription || "Update the coupon details below.") : (dict.admin?.coupons?.createCouponDescription || "Set up a new discount coupon for subscriptions.")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="code">{dict.admin?.coupons?.couponCode || "Coupon Code"}</Label>
                <Input
                  id="code"
                  placeholder="e.g., LAUNCH50"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="uppercase"
                  disabled={!!editingId}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">{dict.admin?.coupons?.descriptionInternal || "Description (internal)"}</Label>
                <Input
                  id="description"
                  placeholder="e.g., Launch promo — 50% off"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{dict.admin?.coupons?.discountType || "Discount Type"}</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, discountType: val as "percentage" | "fixed" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{dict.admin?.coupons?.percentage || "Percentage (%)"}</SelectItem>
                      <SelectItem value="fixed">{dict.admin?.coupons?.fixedAmount || "Fixed Amount"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discountValue">
                    {formData.discountType === "percentage" ? (dict.admin?.coupons?.discountPercent || "Discount (%)") : (dict.admin?.coupons?.discountAmount || "Discount Amount")}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min={0}
                    max={formData.discountType === "percentage" ? 100 : undefined}
                    value={formData.discountValue || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountValue: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxUses">{dict.admin?.coupons?.maxTotalUses || "Max Total Uses (0 = unlimited)"}</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min={0}
                    value={formData.maxUses || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUses: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxUsesPerUser">{dict.admin?.coupons?.maxPerUser || "Max Per User (0 = unlimited)"}</Label>
                  <Input
                    id="maxUsesPerUser"
                    type="number"
                    min={0}
                    value={formData.maxUsesPerUser || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUsesPerUser: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{dict.admin?.coupons?.applicablePlans || "Applicable Plans"}</Label>
                <div className="flex gap-2 flex-wrap">
                  {PLAN_OPTIONS.map((plan) => {
                    const selected = formData.applicablePlans.includes(plan.value)
                    return (
                      <Badge
                        key={plan.value}
                        variant={selected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            applicablePlans: selected
                              ? prev.applicablePlans.filter(p => p !== plan.value)
                              : [...prev.applicablePlans, plan.value],
                          }))
                        }}
                      >
                        {plan.label}
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{dict.admin?.coupons?.applicablePlansHint || "Leave empty to apply to all plans"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="validFrom">{dict.admin?.coupons?.validFrom || "Valid From"}</Label>
                  <Input
                    id="validFrom"
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="validUntil">{dict.admin?.coupons?.validUntil || "Valid Until"}</Label>
                  <Input
                    id="validUntil"
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label>{dict.admin?.common?.active || "Active"}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
                {dict.admin?.common?.cancel || "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingId ? (dict.admin?.coupons?.updateCoupon || "Update Coupon") : (dict.admin?.coupons?.createCouponButton || "Create Coupon")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{dict.admin?.coupons?.totalCoupons || "Total Coupons"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{dict.admin?.coupons?.activeCoupons || "Active Coupons"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {coupons.filter(c => c.isActive && !isExpired(c.validUntil)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{dict.admin?.coupons?.totalRedemptions || "Total Redemptions"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {coupons.reduce((sum, c) => sum + c.usedCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.admin?.coupons?.allCoupons || "All Coupons"}</CardTitle>
          <CardDescription>{dict.admin?.coupons?.allCouponsDescription || "Manage discount codes for your subscription plans"}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{dict.admin?.coupons?.noCouponsYet || "No coupons created yet"}</p>
              <p className="text-sm">{dict.admin?.coupons?.noCouponsDescription || "Create your first coupon to get started"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.admin?.coupons?.tableCode || "Code"}</TableHead>
                    <TableHead>{dict.admin?.coupons?.tableDiscount || "Discount"}</TableHead>
                    <TableHead>{dict.admin?.coupons?.tablePlans || "Plans"}</TableHead>
                    <TableHead>{dict.admin?.coupons?.tableUsage || "Usage"}</TableHead>
                    <TableHead>{dict.admin?.coupons?.tableValidUntil || "Valid Until"}</TableHead>
                    <TableHead>{dict.admin?.coupons?.tableStatus || "Status"}</TableHead>
                    <TableHead className="text-right">{dict.admin?.coupons?.tableActions || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => {
                    const expired = isExpired(coupon.validUntil)
                    const exhausted = coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses
                    return (
                      <TableRow key={coupon._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-semibold text-sm">{coupon.code}</code>
                            <button onClick={() => copyCode(coupon.code)} className="text-muted-foreground hover:text-foreground">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          {coupon.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{coupon.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}%`
                              : `${coupon.discountValue} off`}
                          </span>
                        </TableCell>
                        <TableCell>
                          {coupon.applicablePlans.length === 0 ? (
                            <Badge variant="secondary">{dict.admin?.coupons?.allPlans || "All Plans"}</Badge>
                          ) : (
                            <div className="flex gap-1 flex-wrap">
                              {coupon.applicablePlans.map(p => (
                                <Badge key={p} variant="outline" className="text-xs">
                                  {planLabels[p] || p}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={exhausted ? "text-destructive font-medium" : ""}>
                            {coupon.usedCount}{coupon.maxUses > 0 ? ` / ${coupon.maxUses}` : ""}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={expired ? "text-destructive" : ""}>
                            {new Date(coupon.validUntil).toLocaleDateString(locale)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={coupon.isActive && !expired && !exhausted}
                            disabled={expired || exhausted}
                            onCheckedChange={(checked) => handleToggleActive(coupon._id, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon._id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
