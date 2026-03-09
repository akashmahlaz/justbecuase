"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

interface SubscriptionExpiryToastProps {
  daysLeft: number
  role: "volunteer" | "ngo"
  locale: string
}

export function SubscriptionExpiryToast({ daysLeft, role, locale }: SubscriptionExpiryToastProps) {
  const shown = useRef(false)

  useEffect(() => {
    if (shown.current) return
    shown.current = true

    const pricingUrl = `/${locale}/pricing`

    if (daysLeft <= 0) {
      toast.error("Your Pro Plan Has Expired", {
        description: "You've been downgraded to the Free plan. Renew now to regain access.",
        duration: 10000,
        closeButton: true,
        action: {
          label: "Renew Now",
          onClick: () => { window.location.href = pricingUrl },
        },
      })
    } else {
      toast("Pro Plan Expires in " + daysLeft + " Day" + (daysLeft === 1 ? "" : "s"), {
        description: "Renew now to keep unlimited access and Pro features.",
        duration: 8000,
        closeButton: true,
        action: {
          label: "Renew",
          onClick: () => { window.location.href = pricingUrl },
        },
      })
    }
  }, [daysLeft, role, locale])

  return null
}
