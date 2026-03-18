"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Clock,
  BarChart2,
  Activity,
  Users,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ── Types ──
interface SearchSummary {
  totalQueries: number
  uniqueQueries: number
  zeroResultQueries: number
  zeroResultRate: number
  avgResultsPerQuery: number
  suggestionsServed: number
  resultClicks: number
}

interface TopQuery {
  query: string
  searches: number
  avgResults: number
  lastSearched: string
  zeroResultOccurred: boolean
}

interface ZeroResultEntry {
  query: string
  occurrences: number
  lastSearched: string
  engines: string[]
}

interface DailyVolume {
  date: string
  searches: number
  zeroResults: number
  avgResults: number
}

interface PeakHour {
  hour: number
  searches: number
}

interface EngineEntry {
  engine: string
  count: number
}

interface RecentSearch {
  query: string
  results: number
  engine: string
  took: number
  timestamp: string
}

interface AnalyticsData {
  summary: SearchSummary
  topQueries: TopQuery[]
  zeroResultList: ZeroResultEntry[]
  dailyVolume: DailyVolume[]
  peakHours: PeakHour[]
  engineDistribution: EngineEntry[]
  recentSearches: RecentSearch[]
  range: string
  days: number
}

// ── Mini Bar chart using pure CSS ──
function MiniBarChart({
  data,
  valueKey,
  labelKey,
  color = "bg-primary",
  maxBars = 14,
}: {
  data: any[]
  valueKey: string
  labelKey: string
  color?: string
  maxBars?: number
}) {
  const slice = data.slice(-maxBars)
  const max = Math.max(...slice.map((d) => d[valueKey] || 0), 1)
  return (
    <div className="flex items-end gap-0.5 h-16 w-full">
      {slice.map((d, i) => {
        const height = Math.max(((d[valueKey] || 0) / max) * 100, 2)
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end group relative"
          >
            <div
              className={`w-full rounded-sm ${color} opacity-80 group-hover:opacity-100 transition-all`}
              style={{ height: `${height}%` }}
            />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              {d[labelKey]}: {d[valueKey]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Stat Card ──
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  alert,
  color = "text-foreground",
}: {
  icon: any
  label: string
  value: string | number
  sub?: string
  alert?: boolean
  color?: string
}) {
  return (
    <Card className={alert ? "border-destructive/50 bg-destructive/5" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold ${alert ? "text-destructive" : color}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div
            className={`p-2 rounded-lg ${
              alert ? "bg-destructive/10" : "bg-primary/10"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${alert ? "text-destructive" : "text-primary"}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Page ──
export default function AdminSearchAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d")
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [showAllZero, setShowAllZero] = useState(false)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [tab, setTab] = useState("overview")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/search-analytics?range=${range}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to load")
      setData(json)
      setLastRefreshed(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const s = data?.summary

  // Find peak hour
  const peakHour = data?.peakHours.length
    ? data.peakHours.reduce((a, b) => (b.searches > a.searches ? b : a))
    : null

  function formatHour(h: number) {
    const ampm = h < 12 ? "AM" : "PM"
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}${ampm}`
  }

  const zeroDisplay = showAllZero
    ? data?.zeroResultList || []
    : (data?.zeroResultList || []).slice(0, 8)

  const recentDisplay = showAllRecent
    ? data?.recentSearches || []
    : (data?.recentSearches || []).slice(0, 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-6 w-6" />
            Search Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track what users search, which queries return no results, and how the search engine performs
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastRefreshed && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          {/* Range selector */}
          <div className="flex border rounded-md overflow-hidden">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Zero-result alert banner */}
      {!loading && s && s.zeroResultQueries > 0 && (
        <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                ⚠️ {s.zeroResultQueries} searches returned 0 results in the last {data?.days} days
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                That&apos;s {s.zeroResultRate}% of all searches. Review the &quot;Zero Results&quot; tab to see which queries are failing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading analytics...
        </div>
      )}

      {data && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Search}
              label="Total Searches"
              value={s!.totalQueries.toLocaleString()}
              sub={`${s!.uniqueQueries} unique queries`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Zero-Result Rate"
              value={`${s!.zeroResultRate}%`}
              sub={`${s!.zeroResultQueries} failed searches`}
              alert={s!.zeroResultRate > 15}
            />
            <StatCard
              icon={BarChart2}
              label="Avg Results / Query"
              value={s!.avgResultsPerQuery}
              sub="per search"
            />
            <StatCard
              icon={Zap}
              label="Suggestions Served"
              value={s!.suggestionsServed.toLocaleString()}
              sub="autocomplete calls"
            />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="top-queries">
                Top Queries
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {data.topQueries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="zero-results">
                Zero Results
                {s!.zeroResultQueries > 0 && (
                  <Badge variant="destructive" className="ml-2 text-[10px]">
                    {data.zeroResultList.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="recent">Live Feed</TabsTrigger>
            </TabsList>

            {/* ── OVERVIEW ── */}
            <TabsContent value="overview" className="space-y-5 mt-5">
              {/* Daily volume chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Search Volume — Last {data.days} Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.dailyVolume.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No search data yet for this period.
                    </p>
                  ) : (
                    <>
                      <MiniBarChart
                        data={data.dailyVolume}
                        valueKey="searches"
                        labelKey="date"
                        color="bg-primary"
                        maxBars={30}
                      />
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Searches
                        </span>
                        <span className="mt-1 text-muted-foreground/70">
                          Hover over bars to see exact counts
                        </span>
                      </div>
                      {/* Zero result overlay summary */}
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Zero-Result Days</p>
                        <div className="flex flex-wrap gap-2">
                          {data.dailyVolume
                            .filter((d) => d.zeroResults > 0)
                            .map((d) => (
                              <Badge
                                key={d.date}
                                variant="outline"
                                className="text-[10px] border-amber-400 text-amber-600"
                              >
                                {d.date.slice(5)} — {d.zeroResults} zero-result
                              </Badge>
                            ))}
                          {data.dailyVolume.every((d) => d.zeroResults === 0) && (
                            <span className="text-xs text-muted-foreground">
                              No zero-result days in this period 🎉
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Peak hours */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Peak Search Hours
                    </CardTitle>
                    {peakHour && (
                      <CardDescription>
                        Busiest time: <strong>{formatHour(peakHour.hour)}</strong> with {peakHour.searches} searches
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {data.peakHours.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>
                    ) : (
                      <MiniBarChart
                        data={data.peakHours}
                        valueKey="searches"
                        labelKey="hour"
                        color="bg-blue-500"
                        maxBars={24}
                      />
                    )}
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>12AM</span>
                      <span>6AM</span>
                      <span>12PM</span>
                      <span>6PM</span>
                      <span>12AM</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Engine distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="h-4 w-4" /> Search Engine Usage
                    </CardTitle>
                    <CardDescription>Which backend handled each query</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.engineDistribution.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.engineDistribution.map((e) => {
                          const total = data.engineDistribution.reduce(
                            (a, b) => a + b.count,
                            0
                          )
                          const pct = total > 0 ? Math.round((e.count / total) * 100) : 0
                          const label =
                            e.engine === "algolia"
                              ? "Algolia"
                              : e.engine === "elasticsearch"
                              ? "Elasticsearch"
                              : e.engine === "mongodb-fallback"
                              ? "MongoDB (fallback)"
                              : e.engine === "mongodb"
                              ? "MongoDB"
                              : e.engine
                          return (
                            <div key={e.engine} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium">{label}</span>
                                <span className="text-muted-foreground">
                                  {e.count.toLocaleString()} ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── TOP QUERIES ── */}
            <TabsContent value="top-queries" className="mt-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Most Searched Terms
                  </CardTitle>
                  <CardDescription>
                    Top {data.topQueries.length} queries by search volume in the last {data.days} days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.topQueries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No search data yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.topQueries.map((q, i) => {
                        const maxSearches = data.topQueries[0]?.searches || 1
                        const barWidth = Math.max(
                          (q.searches / maxSearches) * 100,
                          4
                        )
                        return (
                          <div
                            key={q.query}
                            className="relative flex items-center gap-3 rounded-lg border p-3 overflow-hidden"
                          >
                            {/* Bar background */}
                            <div
                              className="absolute inset-y-0 left-0 bg-primary/5"
                              style={{ width: `${barWidth}%` }}
                            />
                            <span className="relative text-xs text-muted-foreground w-5 text-right shrink-0">
                              {i + 1}
                            </span>
                            <span className="relative font-medium text-sm flex-1 truncate">
                              {q.query}
                            </span>
                            <div className="relative flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <span className="text-xs text-muted-foreground">
                                {q.searches}× searched
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                              >
                                ~{q.avgResults} results
                              </Badge>
                              {q.zeroResultOccurred && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px]"
                                >
                                  had 0 results
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── ZERO RESULTS ── */}
            <TabsContent value="zero-results" className="mt-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Searches With 0 Results
                  </CardTitle>
                  <CardDescription>
                    These queries found nothing — consider adding content, improving synonyms, or fixing search index coverage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.zeroResultList.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-2xl mb-2">🎉</p>
                      <p className="text-sm font-medium">No zero-result searches in this period!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Every search found at least one result.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {zeroDisplay.map((q) => (
                          <div
                            key={q.query}
                            className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            <span className="font-medium text-sm flex-1 truncate">
                              &ldquo;{q.query}&rdquo;
                            </span>
                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                {q.occurrences}× searched
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(q.lastSearched).toLocaleDateString()}
                              </span>
                              {q.engines?.map((e) => (
                                <Badge
                                  key={e}
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {e}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {data.zeroResultList.length > 8 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3 w-full text-xs"
                          onClick={() => setShowAllZero(!showAllZero)}
                        >
                          {showAllZero ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" /> Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" /> Show All{" "}
                              {data.zeroResultList.length} Queries
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── LIVE FEED ── */}
            <TabsContent value="recent" className="mt-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Recent Search Log
                  </CardTitle>
                  <CardDescription>
                    Live feed of searches — most recent first
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.recentSearches.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No recent searches.
                    </p>
                  ) : (
                    <>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                Query
                              </th>
                              <th className="text-center px-3 py-2 font-medium text-muted-foreground w-20">
                                Results
                              </th>
                              <th className="text-center px-3 py-2 font-medium text-muted-foreground w-24">
                                Engine
                              </th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">
                                Time
                              </th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">
                                When
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentDisplay.map((s, i) => (
                              <tr
                                key={i}
                                className={`border-b last:border-0 ${
                                  s.results === 0
                                    ? "bg-destructive/5"
                                    : i % 2 === 0
                                    ? ""
                                    : "bg-muted/20"
                                }`}
                              >
                                <td className="px-3 py-2 font-medium truncate max-w-[180px]">
                                  {s.results === 0 && (
                                    <AlertTriangle className="h-3 w-3 text-destructive inline mr-1" />
                                  )}
                                  {s.query}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={
                                      s.results === 0
                                        ? "text-destructive font-bold"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {s.results}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5"
                                  >
                                    {(s.engine || "?")
                                      .replace("elasticsearch", "ES")
                                      .replace("mongodb-fallback", "Mongo↩")
                                      .replace("mongodb", "Mongo")
                                      .replace("algolia", "Algolia")}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-right text-muted-foreground">
                                  {s.took ? `${s.took}ms` : "—"}
                                </td>
                                <td className="px-3 py-2 text-right text-muted-foreground">
                                  {new Date(s.timestamp).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {data.recentSearches.length > 20 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3 w-full text-xs"
                          onClick={() => setShowAllRecent(!showAllRecent)}
                        >
                          {showAllRecent ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" /> Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" /> Show All{" "}
                              {data.recentSearches.length}
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
