"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"

export function NewsletterSubscribe() {
  const dict = useDictionary()
  const nl = (dict as any).footer || {}
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(nl.invalidEmail || "Please enter a valid email")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || (nl.subscribeFailed || "Failed to subscribe"))
        setIsLoading(false)
        return
      }

      setIsSubscribed(true)
    } catch (err: any) {
      setError(nl.somethingWrong || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubscribed) {
    return (
      <div className="flex items-center justify-center gap-2 text-primary">
        <CheckCircle className="h-5 w-5" />
        <span>{nl.thanksSubscribing || "Thanks for subscribing!"}</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input 
          type="email" 
          placeholder={nl.emailPlaceholder || "Enter your email"} 
          className="bg-background"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          maxLength={254}
          aria-required="true"
          aria-label={nl.emailPlaceholder || "Enter your email"}
        />
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            nl.subscribeButton || "Subscribe"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </form>
  )
}
