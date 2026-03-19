"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
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
  Globe,
  RefreshCw,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  ExternalLink,
  Zap,
  Settings2,
  AlertCircle,
  Link2,
  FileText,
  Download,
} from "lucide-react"
import { toast } from "sonner"

interface ScraperConfig {
  platform: string
  enabled: boolean
  cronSchedule?: string
  lastRunAt?: string
  lastRunStatus?: string
  totalItemsScraped: number
  settings: Record<string, string>
}

interface ScraperRun {
  _id: string
  platform: string
  status: string
  startedAt: string
  completedAt?: string
  itemsScraped: number
  itemsNew: number
  itemsUpdated: number
  itemsSkipped: number
  errors: string[]
  triggeredBy: string
}

interface ExternalOpp {
  _id: string
  sourceplatform: string
  externalId: string
  sourceUrl: string
  title: string
  organization: string
  workMode: string
  location?: string
  country?: string
  causes: string[]
  postedDate?: string
  scrapedAt: string
}

const PLATFORM_INFO: Record<string, { name: string; description: string; icon: string }> = {
  reliefweb: { name: "ReliefWeb", description: "UN humanitarian jobs API", icon: "🌍" },
  idealist: { name: "Idealist", description: "Nonprofit volunteer opportunities", icon: "💡" },
  unjobs: { name: "UN Jobs", description: "United Nations job aggregator", icon: "🇺🇳" },
  devex: { name: "Devex", description: "Global development careers", icon: "🔬" },
  impactpool: { name: "Impactpool", description: "Impact career platform", icon: "🎯" },
  workforgood: { name: "Work for Good", description: "Nonprofit job board", icon: "💼" },
  devnetjobs: { name: "DevNetJobs", description: "International development jobs", icon: "🌐" },
}

export default function ScraperAdminPage() {
  const [configs, setConfigs] = useState<ScraperConfig[]>([])
  const [runs, setRuns] = useState<ScraperRun[]>([])
  const [opportunities, setOpportunities] = useState<ExternalOpp[]>([])
  const [oppCounts, setOppCounts] = useState<Record<string, number>>({})
  const [totalOpps, setTotalOpps] = useState(0)
  const [loading, setLoading] = useState(true)
  const [runningPlatform, setRunningPlatform] = useState<string | null>(null)
  const [oppPage, setOppPage] = useState(1)
  const [oppTotal, setOppTotal] = useState(0)
  const [oppFilter, setOppFilter] = useState("")

  // URL scraper state
  const [scrapeUrl, setScrapeUrl] = useState("")
  const [scrapeMode, setScrapeMode] = useState<"single" | "listing">("single")
  const [scrapePlatform, setScrapePlatform] = useState("devex")
  const [scrapeDeep, setScrapeDeep] = useState(false)
  const [scrapeSave, setScrapeSave] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeResults, setScrapeResults] = useState<any[]>([])
  const [scrapeError, setScrapeError] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scraper")
      if (!res.ok) throw new Error("Failed to load scraper data")
      const data = await res.json()
      setConfigs(data.configs || [])
      setRuns(data.recentRuns || [])
      setOppCounts(data.opportunityCounts || {})
      setTotalOpps(data.totalOpportunities || 0)
    } catch (err) {
      toast.error("Failed to load scraper data")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOpportunities = useCallback(async () => {
    const params = new URLSearchParams({ page: String(oppPage), limit: "20" })
    if (oppFilter) params.set("platform", oppFilter)
    const res = await fetch(`/api/admin/scraper/opportunities?${params}`)
    if (res.ok) {
      const data = await res.json()
      setOpportunities(data.opportunities || [])
      setOppTotal(data.pagination?.total || 0)
    }
  }, [oppPage, oppFilter])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchOpportunities() }, [fetchOpportunities])

  const handleRunScraper = async (platform: string) => {
    setRunningPlatform(platform)
    toast.info(`Starting ${PLATFORM_INFO[platform]?.name || platform} scraper...`)
    try {
      const res = await fetch("/api/admin/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", platform }),
      })
      const data = await res.json()
      if (data.success) {
        const r = data.result || data.results?.[0]
        toast.success(
          `${PLATFORM_INFO[platform]?.name}: ${r?.itemsNew || 0} new, ${r?.itemsUpdated || 0} updated`
        )
        fetchData()
        fetchOpportunities()
      } else {
        toast.error(data.error || "Scraper failed")
      }
    } catch {
      toast.error("Network error running scraper")
    } finally {
      setRunningPlatform(null)
    }
  }

  const handleRunAll = async () => {
    setRunningPlatform("all")
    toast.info("Starting all scrapers...")
    try {
      const res = await fetch("/api/admin/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", platform: "all" }),
      })
      const data = await res.json()
      if (data.success) {
        const total = data.results?.reduce((s: number, r: any) => s + (r.itemsNew || 0), 0) || 0
        toast.success(`All scrapers done: ${total} new opportunities`)
        fetchData()
        fetchOpportunities()
      } else {
        toast.error(data.error || "Scraper failed")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setRunningPlatform(null)
    }
  }

  const handleToggle = async (platform: string) => {
    try {
      const res = await fetch("/api/admin/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", platform }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${PLATFORM_INFO[platform]?.name} ${data.enabled ? "enabled" : "disabled"}`)
        fetchData()
      }
    } catch {
      toast.error("Failed to toggle")
    }
  }

  const handleSeed = async () => {
    const res = await fetch("/api/admin/scraper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    })
    if (res.ok) {
      toast.success("Defaults seeded & indexes created")
      fetchData()
    }
  }

  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim()) return toast.error("Enter a URL to scrape")
    setScraping(true)
    setScrapeResults([])
    setScrapeError("")
    try {
      const res = await fetch("/api/admin/scraper/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: scrapeUrl.trim(),
          mode: scrapeMode,
          platform: scrapePlatform,
          deepScrape: scrapeDeep,
          save: scrapeSave,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setScrapeError(data.error || "Scrape failed")
        toast.error(data.error || "Scrape failed")
      } else {
        const results = data.opportunity
          ? [data.opportunity]
          : data.opportunities || []
        setScrapeResults(results)
        const msg = scrapeSave
          ? `Scraped ${results.length} items (${data.newItems || 0} new, saved to DB)`
          : `Found ${results.length} items (preview only)`
        toast.success(msg)
        if (scrapeSave) { fetchData(); fetchOpportunities() }
      }
    } catch {
      setScrapeError("Network error")
      toast.error("Network error")
    } finally {
      setScraping(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunity Scraper</h1>
          <p className="text-muted-foreground">
            Scrape external platforms for volunteer & impact opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed}>
            <Settings2 className="h-4 w-4 mr-2" />
            Seed Defaults
          </Button>
          <Button
            onClick={handleRunAll}
            disabled={runningPlatform !== null}
          >
            {runningPlatform === "all" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Run All Scrapers
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpps.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Platforms</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configs.filter(c => c.enabled).length} / {configs.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {runs[0]?.completedAt
                ? new Date(runs[0].completedAt).toLocaleString()
                : "Never"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {runs.slice(0, 5).reduce((s, r) => s + r.errors.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Configs */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
          <CardDescription>Enable/disable scrapers and trigger manual runs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scraped</TableHead>
                <TableHead>In Database</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => {
                const info = PLATFORM_INFO[config.platform] || { name: config.platform, description: "", icon: "🔗" }
                return (
                  <TableRow key={config.platform}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.icon}</span>
                        <div>
                          <div className="font-medium">{info.name}</div>
                          <div className="text-xs text-muted-foreground">{info.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={() => handleToggle(config.platform)}
                      />
                    </TableCell>
                    <TableCell>{config.totalItemsScraped.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {(oppCounts[config.platform] || 0).toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.lastRunAt ? (
                        <div className="flex items-center gap-1">
                          {config.lastRunStatus === "completed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          ) : config.lastRunStatus === "failed" ? (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-yellow-500" />
                          )}
                          <span className="text-xs">
                            {new Date(config.lastRunAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{config.cronSchedule || "—"}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={runningPlatform !== null || !config.enabled}
                        onClick={() => handleRunScraper(config.platform)}
                      >
                        {runningPlatform === config.platform ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scraper Runs</CardTitle>
          <CardDescription>Audit log of all scraper executions</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet. Click "Run All Scrapers" to start.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Skipped</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.slice(0, 15).map((run) => (
                  <TableRow key={run._id}>
                    <TableCell>
                      <span className="text-sm">
                        {PLATFORM_INFO[run.platform]?.icon} {PLATFORM_INFO[run.platform]?.name || run.platform}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          run.status === "completed" ? "default" :
                          run.status === "failed" ? "destructive" : "secondary"
                        }
                      >
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">+{run.itemsNew}</TableCell>
                    <TableCell>{run.itemsUpdated}</TableCell>
                    <TableCell>{run.itemsSkipped}</TableCell>
                    <TableCell>
                      {run.errors.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {run.errors.length}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{run.triggeredBy}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {run.completedAt && run.startedAt
                        ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* On-Demand URL Scraper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Scrape Any URL
          </CardTitle>
          <CardDescription>
            Paste any job listing or search page URL to extract opportunities using the text scraper engine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.org/jobs/volunteer-coordinator"
              value={scrapeUrl}
              onChange={e => setScrapeUrl(e.target.value)}
              className="flex-1"
            />
            <Select value={scrapeMode} onValueChange={v => setScrapeMode(v as "single" | "listing")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Page</SelectItem>
                <SelectItem value="listing">Listing Page</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scrapePlatform} onValueChange={setScrapePlatform}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.icon} {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={scrapeDeep} onCheckedChange={setScrapeDeep} />
              Deep scrape (fetch detail pages)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={scrapeSave} onCheckedChange={setScrapeSave} />
              Save to database
            </label>
            <Button onClick={handleScrapeUrl} disabled={scraping}>
              {scraping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {scraping ? "Scraping..." : "Scrape"}
            </Button>
          </div>

          {scrapeError && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {scrapeError}
            </div>
          )}

          {scrapeResults.length > 0 && (
            <div className="space-y-3 mt-4">
              <h4 className="text-sm font-medium">
                Results ({scrapeResults.length} {scrapeResults.length === 1 ? "item" : "items"})
              </h4>
              <div className="max-h-[500px] overflow-auto space-y-2">
                {scrapeResults.map((item: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-sm">{item.title}</h5>
                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {item.organization && <span>{item.organization}</span>}
                      {item.location && <span>• {item.location}</span>}
                      {item.workMode && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {item.workMode}
                        </Badge>
                      )}
                      {item.compensationType && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.compensationType}
                        </Badge>
                      )}
                    </div>
                    {item.shortDescription && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.shortDescription}
                      </p>
                    )}
                    {(item.causes?.length > 0 || item.skillsRequired?.length > 0) && (
                      <div className="flex gap-1 flex-wrap">
                        {item.causes?.slice(0, 5).map((c: string) => (
                          <Badge key={c} variant="outline" className="text-[10px]">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scraped Opportunities</CardTitle>
              <CardDescription>{oppTotal.toLocaleString()} total external opportunities</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={oppFilter === "" ? "default" : "outline"}
                size="sm"
                onClick={() => { setOppFilter(""); setOppPage(1) }}
              >
                All
              </Button>
              {Object.keys(PLATFORM_INFO).filter(p => configs.some(c => c.platform === p)).map(p => (
                <Button
                  key={p}
                  variant={oppFilter === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setOppFilter(p); setOppPage(1) }}
                >
                  {PLATFORM_INFO[p].icon} {PLATFORM_INFO[p].name}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No opportunities scraped yet. Run a scraper to populate this list.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Scraped</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp._id}>
                      <TableCell>
                        <div className="max-w-[300px] truncate font-medium">{opp.title}</div>
                      </TableCell>
                      <TableCell className="text-sm">{opp.organization}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PLATFORM_INFO[opp.sourceplatform]?.icon} {PLATFORM_INFO[opp.sourceplatform]?.name || opp.sourceplatform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {opp.location || opp.country || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {opp.workMode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(opp.scrapedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {oppPage} of {Math.ceil(oppTotal / 20)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={oppPage <= 1}
                    onClick={() => setOppPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={oppPage >= Math.ceil(oppTotal / 20)}
                    onClick={() => setOppPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
