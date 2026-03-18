"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UserPlus, UserCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { followUser, unfollowUser } from "@/lib/actions"
import { useDictionary } from "@/components/dictionary-provider"
import { CoolMode } from "@/components/ui/cool-mode"

interface FollowButtonProps {
  /** The user ID to follow/unfollow */
  targetId: string
  /** Display name for toast messages */
  targetName: string
  /** Whether the current viewer is already following this user */
  isFollowing: boolean
  /** Initial follower count */
  followersCount: number
  /** Show follower count next to button */
  showCount?: boolean
  /** Button size variant */
  size?: "default" | "sm" | "lg"
  /** Additional className */
  className?: string
}

export function FollowButton({
  targetId,
  targetName,
  isFollowing: initialIsFollowing,
  followersCount: initialCount,
  showCount = true,
  size = "default",
  className,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followersCount, setFollowersCount] = useState(initialCount)
  const [isHovering, setIsHovering] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const dict = useDictionary()
  const t = (dict as any).common || {}

  const handleToggle = useCallback(() => {
    startTransition(async () => {
      try {
        const result = isFollowing
          ? await unfollowUser(targetId)
          : await followUser(targetId)

        if (!result.success) {
          toast.error(result.error || (t.failedUpdateFollow || "Failed to update follow status"))
          return
        }

        const newIsFollowing = !isFollowing
        setIsFollowing(newIsFollowing)
        setFollowersCount(result.data?.followersCount ?? followersCount)

        toast.success(
          newIsFollowing
            ? (t.nowFollowing || "You are now following {name}").replace("{name}", targetName)
            : (t.unfollowed || "Unfollowed {name}").replace("{name}", targetName),
          {
            icon: newIsFollowing ? "👥" : undefined,
          }
        )

        // Refresh server data so FollowStatsDisplay updates
        router.refresh()
      } catch {
        toast.error(t.somethingWrongRetry || "Something went wrong. Please try again.")
      }
    })
  }, [targetId, targetName, isFollowing, followersCount, router])

  // Format large numbers
  const formatCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
    return count.toString()
  }

  const buttonLabel = isPending
    ? ""
    : isFollowing
      ? isHovering
        ? (t.unfollow || "Unfollow")
        : (t.following || "Following")
      : (t.follow || "Follow")

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CoolMode options={{ particleCount: 20, size: 8 }}>
      <Button
        variant={isFollowing ? (isHovering ? "destructive" : "outline") : "default"}
        size={size}
        onClick={handleToggle}
        disabled={isPending}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "min-w-[110px] w-full transition-all duration-200 font-medium",
          isFollowing && !isHovering && "border-primary/30 text-primary",
          size === "sm" && "min-w-[90px]"
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          isHovering ? (
            <>
              <UserPlus className="h-4 w-4 mr-1.5" />
              {buttonLabel}
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-1.5" />
              {buttonLabel}
            </>
          )
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-1.5" />
            {buttonLabel}
          </>
        )}
      </Button>
      </CoolMode>

      {showCount && (
        <span className="text-sm text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">{formatCount(followersCount)}</span>
          {" "}
          {followersCount === 1 ? (t.follower || "follower") : (t.followers || "followers")}
        </span>
      )}
    </div>
  )
}
