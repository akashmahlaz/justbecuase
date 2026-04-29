"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { saveCandidateSourceLink } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Link2, Loader2 } from "lucide-react"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function CandidateSourceLinkGenerator({ lang }: { lang: string }) {
  const router = useRouter()
  const [collegeName, setCollegeName] = useState("")
  const [collegeCode, setCollegeCode] = useState("")
  const [campaign, setCampaign] = useState("")
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")
  const [isCopying, setIsCopying] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const generatedCode = collegeCode.trim() || slugify(collegeName)
  const registrationLink = useMemo(() => {
    const params = new URLSearchParams()
    params.set("role", "candidate")
    if (generatedCode) params.set("college", generatedCode)
    if (collegeName.trim()) params.set("collegeName", collegeName.trim())
    if (campaign.trim()) params.set("campaign", campaign.trim())

    return `${origin}/${lang}/auth/signup?${params.toString()}`
  }, [campaign, collegeName, generatedCode, lang, origin])

  const handleCopy = async () => {
    if (!generatedCode || !collegeName.trim()) return
    setIsCopying(true)
    setMessage("")
    const result = await saveCandidateSourceLink({
      sourceCode: generatedCode,
      sourceName: collegeName.trim(),
      sourceType: "college",
      campaign: campaign.trim() || undefined,
    })
    if (!result.success) {
      setIsCopying(false)
      setMessage(result.error || "Unable to save link")
      return
    }
    await navigator.clipboard.writeText(registrationLink)
    setIsCopying(false)
    setCopied(true)
    setMessage("Saved and copied. You can copy this link later from Source Summary.")
    router.refresh()
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-5" />
          Create College Registration Link
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="collegeName">College name</Label>
            <Input
              id="collegeName"
              value={collegeName}
              onChange={(event) => setCollegeName(event.target.value)}
              placeholder="Delhi University"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="collegeCode">College code</Label>
            <Input
              id="collegeCode"
              value={collegeCode}
              onChange={(event) => setCollegeCode(slugify(event.target.value))}
              placeholder="delhi-university"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="campaign">Campaign</Label>
            <Input
              id="campaign"
              value={campaign}
              onChange={(event) => setCampaign(event.target.value)}
              placeholder="spring-2026"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 md:flex-row md:items-center md:justify-between">
          <code className="break-all text-xs text-muted-foreground">{registrationLink}</code>
          <Button type="button" onClick={handleCopy} disabled={!generatedCode || !collegeName.trim() || isCopying} className="shrink-0">
            {isCopying ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            {isCopying ? "Saving..." : copied ? "Copied" : "Copy Link"}
          </Button>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  )
}