"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Unlock, Crown, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import LocaleLink from "@/components/locale-link"

interface UnlockProfileButtonProps {
  volunteerId: string
  volunteerName?: string
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
  subscriptionPlan?: "free" | "pro" // NGO's current plan
  isAlreadyUnlocked?: boolean // Whether this profile is already unlocked
}

// BUSINESS MODEL:
// - NGO Pro subscription = Can unlock UNLIMITED free volunteer profiles
// - NGO Free = Cannot unlock any profiles, must upgrade to Pro
// - NO individual profile unlock payment (removed)

export function UnlockProfileButton({
  volunteerId,
  volunteerName,
  onSuccess,
  onError,
  className,
  subscriptionPlan = "free",
  isAlreadyUnlocked = false,
}: UnlockProfileButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Handle unlock for Pro users (free unlock via subscription)
  const handleProUnlock = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/payments/unlock-with-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to unlock profile")
      }

      toast.success("Profile unlocked!", {
        description: `You can now view ${volunteerName || "the impact agent"}'s full profile.`,
      })
      
      onSuccess?.()
      // Reload the page to show unlocked profile
      window.location.reload()
    } catch (error: any) {
      console.error("Unlock error:", error)
      toast.error("Failed to unlock", {
        description: error.message || "Something went wrong",
      })
      onError?.(error.message || "Failed to unlock profile")
    } finally {
      setIsLoading(false)
    }
  }

  // Already unlocked - show disabled button
  if (isAlreadyUnlocked) {
    return (
      <Button
        disabled
        variant="outline"
        className={className}
      >
        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
        Profile Unlocked
      </Button>
    )
  }

  // Pro user - can unlock unlimited profiles for free
  if (subscriptionPlan === "pro") {
    return (
      <Button
        onClick={handleProUnlock}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Unlocking...
          </>
        ) : (
          <>
            <Unlock className="h-4 w-4 mr-2" />
            Unlock Profile
          </>
        )}
      </Button>
    )
  }

  // Free user - must upgrade to Pro (no pay-per-profile option)
  return (
    <Button
      asChild
      variant="default"
      className={className}
    >
      <LocaleLink href="/pricing">
        <Crown className="h-4 w-4 mr-2" />
        Upgrade to Pro to Unlock
      </LocaleLink>
    </Button>
  )
}
