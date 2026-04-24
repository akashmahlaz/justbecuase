"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserCheck, ChevronLeft, ChevronRight } from "lucide-react"
import LocaleLink from "@/components/locale-link"

interface FollowUser {
  id: string
  name: string
  avatar?: string
  role: string
  headline?: string
}

interface FollowStatsDisplayProps {
  userId: string
  followersCount: number
  followingCount: number
  className?: string
}

/**
 * Clickable follower/following counts that open a modal with full lists
 */
export function FollowStatsDisplay({
  userId,
  followersCount: initialFollowersCount,
  followingCount: initialFollowingCount,
  className,
}: FollowStatsDisplayProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"followers" | "following">("followers")
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [followingCount, setFollowingCount] = useState(initialFollowingCount)

  // Sync state when server data changes (e.g. after router.refresh())
  useEffect(() => {
    setFollowersCount(initialFollowersCount)
  }, [initialFollowersCount])

  useEffect(() => {
    setFollowingCount(initialFollowingCount)
  }, [initialFollowingCount])

  const formatCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
    return count.toString()
  }

  const openFollowers = () => {
    setActiveTab("followers")
    setOpen(true)
  }

  const openFollowing = () => {
    setActiveTab("following")
    setOpen(true)
  }

  return (
    <>
      <div className={`flex items-center gap-4 ${className || ""}`}>
        <button
          onClick={openFollowers}
          className="flex items-center gap-1 text-sm hover:underline transition-colors cursor-pointer"
        >
          <span className="font-bold text-foreground">{formatCount(followersCount)}</span>
          <span className="text-muted-foreground">{followersCount === 1 ? "Follower" : "Followers"}</span>
        </button>

        <button
          onClick={openFollowing}
          className="flex items-center gap-1 text-sm hover:underline transition-colors cursor-pointer"
        >
          <span className="font-bold text-foreground">{formatCount(followingCount)}</span>
          <span className="text-muted-foreground">Following</span>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Connections</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="followers" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Followers ({formatCount(followersCount)})
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                Following ({formatCount(followingCount)})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="followers" className="flex-1 overflow-y-auto mt-4">
              <UserList userId={userId} type="followers" />
            </TabsContent>

            <TabsContent value="following" className="flex-1 overflow-y-auto mt-4">
              <UserList userId={userId} type="following" />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

function UserList({ userId, type }: { userId: string; type: "followers" | "following" }) {
  const [users, setUsers] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)

  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/follow/${type}?userId=${userId}&page=${p}&limit=20`)
      const data = await response.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
      setPage(p)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [userId, type])

  useEffect(() => {
    fetchUsers(1)
  }, [fetchUsers])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">
          {type === "followers" ? "No followers yet" : "Not following anyone yet"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {users.map((user) => (
        <LocaleLink
          key={user.id}
          href={user.role === "ngo" ? `/ngos/${user.id}` : `/volunteers/${user.id}`}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs font-medium">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{user.name}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {user.role === "ngo" ? "NGO" : "Impact Agent"}
              </Badge>
            </div>
            {user.headline && (
              <p className="text-xs text-muted-foreground truncate">{user.headline}</p>
            )}
          </div>
        </LocaleLink>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t mt-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => fetchUsers(page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => fetchUsers(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
