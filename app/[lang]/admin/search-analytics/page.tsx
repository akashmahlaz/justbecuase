"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Clock,
  MousePointerClick,
  Zap,
  RefreshCw,
  Activity,
  Eye,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  FileWarning,
  Gauge,
  Server,
  Users,
  UserX,
  Radio,
  Monitor,
  Smartphone,
  Tablet,
  Bot,
} from "lucide-react"

type TimeRange = "7" | "14" | "30" | "90"

interface OverviewStats {
  totalSearches: number
  uniqueQueries: number
  avgResultCount: number
  zeroResultRate: number
  avgResponseTime: number
  clickThroughRate: number
  searchesWithFilters: number
  roleExpansionRate: number
}

interface TopQuery {
  query: string
  count: number
  avgResults: number
  zeroResultRate: number
}

interface ZeroResultQuery {
  query: string
  count: number
  lastSearched: string
}

interface TrendingQuery {
  query: string
  count: number
  avgResults: number
}

interface DailyVolume {
  date: string
  searches: number
  zeroResults: number
}

interface EngineBreakdown {
  engine: string
  count: number
  avgTime: number
}

interface ContentGap {
  query: string
  searches: number
  avgResults: number
}

interface RecentSearch {
  _id: string
  query: string
  normalizedQuery: string
  resultCount: number
  engine: string
  took: number
  isZeroResult: boolean
  roleExpansionUsed: boolean
  filtersRelaxed: boolean
  timestamp: string
  userRole?: string
  userId?: string
  ip?: string
  userAgent?: string
  deviceType?: string
  anonymousId?: string
  topResultTitles?: string[]
  inferredFilters?: Record<string, any>
}

interface UserSearchStat {
  userId: string | null
  anonymousId: string | null
  searchCount: number
  uniqueQueries: number
  lastSearch: string
  zeroResults: number
}

export default function SearchAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30")
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [topQueries, setTopQueries] = useState<TopQuery[]>([])
  const [zeroResults, setZeroResults] = useState<ZeroResultQuery[]>([])
  const [trending, setTrending] = useState<TrendingQuery[]>([])
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([])
  const [engineBreakdown, setEngineBreakdown] = useState<EngineBreakdown[]>([])
  const [contentGaps, setContentGaps] = useState<ContentGap[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [liveFeed, setLiveFeed] = useState<RecentSearch[]>([])
  const [userSearchStats, setUserSearchStats] = useState<UserSearchStat[]>([])
  const [liveAutoRefresh, setLiveAutoRefresh] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const days = timeRange
      const [overviewRes, topRes, zeroRes, trendRes, dailyRes, engineRes, gapRes, recentRes, liveRes, userStatsRes] = await Promise.all([
        fetch(`/api/admin/search-analytics?section=overview&days=${days}`),
        fetch(`/api/admin/search-analytics?section=top-queries&days=${days}&limit=30`),
        fetch(`/api/admin/search-analytics?section=zero-results&days=${days}&limit=30`),
        fetch(`/api/admin/search-analytics?section=trending&hours=24&limit=15`),
        fetch(`/api/admin/search-analytics?section=daily-volume&days=${days}`),
        fetch(`/api/admin/search-analytics?section=engine-breakdown&days=${days}`),
        fetch(`/api/admin/search-analytics?section=content-gaps&days=${days}&limit=20`),
        fetch(`/api/admin/search-analytics?section=recent&limit=50`),
        fetch(`/api/admin/search-analytics?section=live-feed&limit=30`),
        fetch(`/api/admin/search-analytics?section=user-search-stats&days=${days}&limit=30`),
      ])

      const [overviewData, topData, zeroData, trendData, dailyData, engineData, gapData, recentData, liveData, userStatsData] = await Promise.all([
        overviewRes.json(), topRes.json(), zeroRes.json(), trendRes.json(),
        dailyRes.json(), engineRes.json(), gapRes.json(), recentRes.json(),
        liveRes.json(), userStatsRes.json(),
      ])

      if (overviewData.success) setOverview(overviewData.data)
      if (topData.success) setTopQueries(topData.data)
      if (zeroData.success) setZeroResults(zeroData.data)
      if (trendData.success) setTrending(trendData.data)
      if (dailyData.success) setDailyVolume(dailyData.data)
      if (engineData.success) setEngineBreakdown(engineData.data)
      if (gapData.success) setContentGaps(gapData.data)
      if (recentData.success) setRecentSearches(recentData.data)
      if (liveData.success) setLiveFeed(liveData.data)
      if (userStatsData.success) setUserSearchStats(userStatsData.data)
    } catch (err) {
      console.error("Failed to fetch search analytics:", err)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  // Auto-refresh live feed every 15 seconds
  useEffect(() => {
    if (!liveAutoRefresh) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/search-analytics?section=live-feed&limit=30`)
        const data = await res.json()
        if (data.success) setLiveFeed(data.data)
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [liveAutoRefresh])

  useEffect(() => { fetchData() }, [fetchData])

  const maxDaily = Math.max(...dailyVolume.map(d => d.searches), 1)

  const deviceIcon = (type?: string) => {
    switch (type) {
      case "mobile": return <Smartphone className="h-3 w-3" />
      case "tablet": return <Tablet className="h-3 w-3" />
      case "bot": return <Bot className="h-3 w-3" />
      default: return <Monitor className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Search Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive insights into platform search behavior, content gaps, and user intent
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["7", "14", "30", "90"] as TimeRange[]).map(range => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}d
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading && !overview ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Overview Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Searches"
              value={overview?.totalSearches ?? 0}
              icon={<Search className="h-4 w-4" />}
              description="Full search queries"
            />
            <StatCard
              title="Unique Queries"
              value={overview?.uniqueQueries ?? 0}
              icon={<Eye className="h-4 w-4" />}
              description="Distinct search terms"
            />
            <StatCard
              title="Zero Result Rate"
              value={`${overview?.zeroResultRate ?? 0}%`}
              icon={<AlertTriangle className="h-4 w-4" />}
              status={overview && overview.zeroResultRate > 20 ? "danger" : overview && overview.zeroResultRate > 10 ? "warning" : "success"}
              description="Searches with no results"
            />
            <StatCard
              title="Avg Response Time"
              value={`${overview?.avgResponseTime ?? 0}ms`}
              icon={<Zap className="h-4 w-4" />}
              status={overview && overview.avgResponseTime > 500 ? "danger" : overview && overview.avgResponseTime > 200 ? "warning" : "success"}
              description="Search latency"
            />
            <StatCard
              title="Avg Results"
              value={overview?.avgResultCount ?? 0}
              icon={<BarChart3 className="h-4 w-4" />}
              description="Results per search"
            />
            <StatCard
              title="Click-Through Rate"
              value={`${overview?.clickThroughRate ?? 0}%`}
              icon={<MousePointerClick className="h-4 w-4" />}
              description="Searches with clicks"
            />
            <StatCard
              title="Role Expansion"
              value={`${overview?.roleExpansionRate ?? 0}%`}
              icon={<Zap className="h-4 w-4" />}
              description="AI skill expansion used"
            />
            <StatCard
              title="With Filters"
              value={overview?.searchesWithFilters ?? 0}
              icon={<Filter className="h-4 w-4" />}
              description="NLP-inferred filters"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Daily Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Daily Search Volume
                </CardTitle>
                <CardDescription>Searches per day over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyVolume.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                ) : (
                  <div className="space-y-1">
                    {dailyVolume.slice(-14).map(day => (
                      <div key={day.date} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-muted-foreground shrink-0">{day.date.slice(5)}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <div
                            className="h-5 rounded-sm bg-primary/80 transition-all"
                            style={{ width: `${(day.searches / maxDaily) * 100}%`, minWidth: day.searches > 0 ? "4px" : "0" }}
                          />
                          {day.zeroResults > 0 && (
                            <div
                              className="h-5 rounded-sm bg-destructive/60"
                              style={{ width: `${(day.zeroResults / maxDaily) * 100}%`, minWidth: "4px" }}
                            />
                          )}
                        </div>
                        <span className="w-8 text-right font-medium">{day.searches}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary/80 inline-block" /> Searches</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive/60 inline-block" /> Zero Results</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engine Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-4 w-4 text-primary" />
                  Search Engine Performance
                </CardTitle>
                <CardDescription>Breakdown by search engine used</CardDescription>
              </CardHeader>
              <CardContent>
                {engineBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                ) : (
                  <div className="space-y-4">
                    {engineBreakdown.map(e => {
                      const total = engineBreakdown.reduce((s, x) => s + x.count, 0)
                      const pct = total > 0 ? Math.round((e.count / total) * 100) : 0
                      return (
                        <div key={e.engine} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge variant={e.engine === "algolia" ? "default" : "secondary"}>
                                {e.engine}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{e.count} searches</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>{e.avgTime}ms avg</span>
                              <span className="font-medium">{pct}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${e.engine === "algolia" ? "bg-primary" : e.engine === "elasticsearch" ? "bg-blue-500" : "bg-amber-500"}`}
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

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Queries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Top Search Queries
                </CardTitle>
                <CardDescription>Most popular searches in the last {timeRange} days</CardDescription>
              </CardHeader>
              <CardContent>
                {topQueries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No search data collected yet</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {topQueries.map((q, i) => (
                      <div key={q.query} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-muted-foreground w-6 text-right shrink-0">#{i + 1}</span>
                          <span className="font-medium text-sm truncate">&quot;{q.query}&quot;</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">{q.count}x</Badge>
                          <Badge variant="secondary" className="text-xs">{q.avgResults} avg</Badge>
                          {q.zeroResultRate > 0 && (
                            <Badge variant="destructive" className="text-xs">{q.zeroResultRate}% empty</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trending Now (24h) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Trending Now
                </CardTitle>
                <CardDescription>Most searched in the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                {trending.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No searches in the last 24 hours</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {trending.map((q, i) => (
                      <div key={q.query} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <ArrowUpRight className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="font-medium text-sm truncate">&quot;{q.query}&quot;</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">{q.count}x</Badge>
                          <Badge variant="secondary" className="text-xs">{q.avgResults} results</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Zero Result Queries */}
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Zero Result Queries
                </CardTitle>
                <CardDescription>Searches that returned no results — potential content gaps</CardDescription>
              </CardHeader>
              <CardContent>
                {zeroResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No zero-result queries — great!</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {zeroResults.map(q => (
                      <div key={q.query} className="flex items-center justify-between p-2 rounded-lg hover:bg-destructive/5 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileWarning className="h-4 w-4 text-destructive shrink-0" />
                          <span className="font-medium text-sm truncate">&quot;{q.query}&quot;</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="destructive" className="text-xs">{q.count}x</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(q.lastSearched).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Gaps */}
            <Card className="border-amber-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge className="h-4 w-4 text-amber-500" />
                  Content Gap Report
                </CardTitle>
                <CardDescription>Repeatedly searched terms with fewer than 3 results (searched 2+ times)</CardDescription>
              </CardHeader>
              <CardContent>
                {contentGaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No significant content gaps detected</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {contentGaps.map(g => (
                      <div key={g.query} className="flex items-center justify-between p-2 rounded-lg hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <ArrowDownRight className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="font-medium text-sm truncate">&quot;{g.query}&quot;</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">{g.searches} searches</Badge>
                          <Badge variant="secondary" className="text-xs">{g.avgResults} avg results</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Search Feed */}
          <Card className="border-green-200/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                    Live Search Feed
                  </CardTitle>
                  <CardDescription>Real-time search activity (auto-refreshes every 15s)</CardDescription>
                </div>
                <Button
                  variant={liveAutoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
                >
                  {liveAutoRefresh ? "Pause" : "Resume"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {liveFeed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No searches yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Query</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Results</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Engine</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">User</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Device</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Speed</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Flags</th>
                        <th className="pb-2 font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveFeed.map(s => (
                        <tr key={s._id} className={`border-b last:border-0 ${s.isZeroResult ? "bg-destructive/5" : ""}`}>
                          <td className="py-2 pr-3 max-w-[180px] truncate font-medium">&quot;{s.query}&quot;</td>
                          <td className="py-2 pr-3">
                            <Badge variant={s.isZeroResult ? "destructive" : "secondary"} className="text-xs">
                              {s.resultCount}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className="text-xs">{s.engine}</Badge>
                          </td>
                          <td className="py-2 pr-3">
                            {s.userId ? (
                              <Badge className="text-[10px] px-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                <Users className="h-3 w-3 mr-1 inline" />{s.userId.slice(0, 8)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1">
                                <UserX className="h-3 w-3 mr-1 inline" />{s.anonymousId?.slice(0, 8) || "anon"}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {deviceIcon(s.deviceType)}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{s.took}ms</td>
                          <td className="py-2 pr-3">
                            <div className="flex gap-1">
                              {s.roleExpansionUsed && <Badge className="text-[10px] px-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">AI</Badge>}
                              {s.filtersRelaxed && <Badge className="text-[10px] px-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">relaxed</Badge>}
                              {s.inferredFilters && Object.keys(s.inferredFilters).length > 0 && (
                                <Badge className="text-[10px] px-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">NLP</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2 text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(s.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Search Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Per-User Search Activity
              </CardTitle>
              <CardDescription>Search behavior by user (logged-in and anonymous) over the last {timeRange} days</CardDescription>
            </CardHeader>
            <CardContent>
              {userSearchStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No user search data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 font-medium text-muted-foreground">User</th>
                        <th className="pb-2 pr-4 font-medium text-muted-foreground">Searches</th>
                        <th className="pb-2 pr-4 font-medium text-muted-foreground">Unique Queries</th>
                        <th className="pb-2 pr-4 font-medium text-muted-foreground">Zero Results</th>
                        <th className="pb-2 font-medium text-muted-foreground">Last Search</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userSearchStats.map((u, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            {u.userId ? (
                              <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                <Users className="h-3 w-3 mr-1 inline" />{u.userId.slice(0, 12)}...
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <UserX className="h-3 w-3 mr-1 inline" />{u.anonymousId?.slice(0, 12) || "anonymous"}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 pr-4 font-medium">{u.searchCount}</td>
                          <td className="py-2 pr-4">{u.uniqueQueries}</td>
                          <td className="py-2 pr-4">
                            {u.zeroResults > 0 ? (
                              <Badge variant="destructive" className="text-xs">{u.zeroResults}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="py-2 text-muted-foreground text-xs">
                            {new Date(u.lastSearch).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Searches (Detailed) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Recent Search Activity (Detailed)
              </CardTitle>
              <CardDescription>Last 50 searches with full tracking data</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSearches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent searches</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Query</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Results</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Engine</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">User</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Device</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Speed</th>
                        <th className="pb-2 pr-3 font-medium text-muted-foreground">Flags</th>
                        <th className="pb-2 font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSearches.map(s => (
                        <tr key={s._id} className={`border-b last:border-0 ${s.isZeroResult ? "bg-destructive/5" : ""}`}>
                          <td className="py-2 pr-3 max-w-[200px] truncate font-medium">&quot;{s.query}&quot;</td>
                          <td className="py-2 pr-3">
                            <Badge variant={s.isZeroResult ? "destructive" : "secondary"} className="text-xs">
                              {s.resultCount}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className="text-xs">{s.engine}</Badge>
                          </td>
                          <td className="py-2 pr-3">
                            {s.userId ? (
                              <span className="text-xs text-blue-600">{s.userId.slice(0, 8)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{s.anonymousId?.slice(0, 8) || "anon"}</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {deviceIcon(s.deviceType)}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{s.took}ms</td>
                          <td className="py-2 pr-3">
                            <div className="flex gap-1">
                              {s.roleExpansionUsed && <Badge className="text-[10px] px-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">AI</Badge>}
                              {s.filtersRelaxed && <Badge className="text-[10px] px-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">relaxed</Badge>}
                              {s.inferredFilters && Object.keys(s.inferredFilters).length > 0 && (
                                <Badge className="text-[10px] px-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">NLP</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2 text-muted-foreground text-xs">
                            {new Date(s.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({ title, value, icon, description, status }: {
  title: string
  value: string | number
  icon: React.ReactNode
  description: string
  status?: "success" | "warning" | "danger"
}) {
  const statusColor = status === "danger" ? "text-destructive" : status === "warning" ? "text-amber-500" : status === "success" ? "text-green-500" : "text-foreground"
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">{icon}</span>
          {status && (
            <span className={`h-2 w-2 rounded-full ${status === "danger" ? "bg-destructive" : status === "warning" ? "bg-amber-500" : "bg-green-500"}`} />
          )}
        </div>
        <div className={`text-2xl font-bold ${statusColor}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
        <p className="text-[10px] text-muted-foreground/70">{description}</p>
      </CardContent>
    </Card>
  )
}
