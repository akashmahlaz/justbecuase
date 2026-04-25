"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  ExternalLink,
  Globe,
  MapPin,
  Clock,
  RefreshCw,
  Search,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"

interface CatchafireOpp {
  _id: string
  sourceplatform: string
  externalId: string
  sourceUrl: string
  title: string
  organization: string
  workMode: string
  location?: string
  city?: string
  country?: string
  causes: string[]
  skillsRequired: Array<{ categoryId: string; subskillId: string; priority: string }>
  timeCommitment?: string
  compensationType?: string
  description: string
  shortDescription?: string
  postedDate?: string
  deadline?: string
  isActive: boolean
  scrapedAt: string
}

export default function CatchafireAdminPage() {
  const [opportunities, setOpportunities] = useState<CatchafireOpp[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const limit = 20

  const fetchOpportunities = useCallback(async (pg = page, status = statusFilter, query = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        platform: "catchafire",
        page: String(pg),
        limit: String(limit),
      })
      if (status === "active") params.set("isActive", "true")
      else if (status === "inactive") params.set("isActive", "false")
      if (query) params.set("search", query)

      const res = await fetch(`/api/admin/scraper/opportunities?${params}`)
      const data = await res.json()
      setOpportunities(data.opportunities || [])
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      console.error("Failed to fetch jobs:", err)
      toast.error("Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  const triggerScrape = async () => {
    setScraping(true)
    setScrapeResult(null)
    try {
      const res = await fetch("/api/cron/catchafire")
      const data = await res.json()
      setScrapeResult(data)
      if (data.success) {
        toast.success(`Scrape complete: ${data.stats?.new || 0} new, ${data.stats?.updated || 0} updated`)
      } else {
        toast.error(data.error || "Scrape failed")
      }
      // Refresh list
      fetchOpportunities(1)
    } catch (err) {
      toast.error("Failed to trigger scrape")
    } finally {
      setScraping(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catchafire</h1>
          <p className="text-muted-foreground">
            Skills-based volunteer opportunities from catchafire.org
          </p>
        </div>
        <Button onClick={triggerScrape} disabled={scraping} className="gap-2">
          {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {scraping ? "Scraping..." : "Run Scrape"}
        </Button>
      </div>

      {/* Scrape Result */}
      {scrapeResult && (
        <Card className={scrapeResult.success ? "border-green-500" : "border-red-500"}>
          <CardContent className="pt-4">
            {scrapeResult.success ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Scrape completed successfully</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Scrape failed: {scrapeResult.error}</span>
              </div>
            )}
            {scrapeResult.stats && (
              <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                <span>Scraped: {scrapeResult.stats.scraped}</span>
                <span>New: {scrapeResult.stats.new}</span>
                <span>Updated: {scrapeResult.stats.updated}</span>
                <span>Skipped: {scrapeResult.stats.skipped}</span>
                <span>Time: {scrapeResult.stats.elapsedSeconds}s</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Total Opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {opportunities.filter(o => o.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Active (this page)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Catchafire
            </div>
            <p className="text-xs text-muted-foreground">Source Platform</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Opportunities</CardTitle>
          <CardDescription>
            Showing {opportunities.length} of {total} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No opportunities found. Try running the scrape first.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Commitment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scraped</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp._id}>
                      <TableCell className="max-w-[200px]">
                        <div className="font-medium truncate" title={opp.title}>
                          {opp.title}
                        </div>
                        {opp.shortDescription && (
                          <div className="text-xs text-muted-foreground truncate">
                            {opp.shortDescription}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[120px]" title={opp.organization}>
                            {opp.organization || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {opp.location || opp.city || "Remote"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {opp.timeCommitment || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={opp.isActive ? "default" : "secondary"}>
                          {opp.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {opp.scrapedAt ? new Date(opp.scrapedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="gap-1">
                          <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
