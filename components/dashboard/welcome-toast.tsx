"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDictionary } from "@/components/dictionary-provider"

export function WelcomeToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const dict = useDictionary()
  
  useEffect(() => {
    const welcomeName = searchParams.get("welcome")
    if (welcomeName) {
      // Show welcome toast with the volunteer's name
      toast.success((dict.volunteer?.welcomeToast?.title || "Welcome to JustBeCause, {name}!").replace("{name}", decodeURIComponent(welcomeName)), {
        description: dict.volunteer?.welcomeToast?.description || "Your profile has been set up successfully. Start exploring impact opportunities!",
        duration: 5000,
      })
      
      // Clean up the URL by removing the welcome parameter
      const newUrl = window.location.pathname
      router.replace(newUrl)
    }
  }, [searchParams, router, dict])
  
  return null
}
