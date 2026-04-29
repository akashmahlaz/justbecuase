"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Link2 } from "lucide-react"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function CandidateSourceLinkGenerator({ lang }: { lang: string }) {
  const [collegeName, setCollegeName] = useState("")
  const [collegeCode, setCollegeCode] = useState("")
  const [campaign, setCampaign] = useState("")
  const [copied, setCopied] = useState(false)

  const generatedCode = collegeCode.trim() || slugify(collegeName)
  const registrationLink = useMemo(() => {
    const params = new URLSearchParams()
    params.set("role", "candidate")
    if (generatedCode) params.set("college", generatedCode)
    if (collegeName.trim()) params.set("collegeName", collegeName.trim())
    if (campaign.trim()) params.set("campaign", campaign.trim())

    const path = `/${lang}/auth/signup?${params.toString()}`
    if (typeof window === "undefined") return path
    return `${window.location.origin}${path}`
  }, [campaign, collegeName, generatedCode, lang])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(registrationLink)
    setCopied(true)
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
          <Button type="button" onClick={handleCopy} disabled={!generatedCode} className="shrink-0">
            <Copy className="size-4" />
            {copied ? "Copied" : "Copy Link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}