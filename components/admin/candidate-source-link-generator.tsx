"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { saveCandidateSourceLink } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Link2, Loader2, Save } from "lucide-react"

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
  const [isSaving, setIsSaving] = useState(false)
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
    await navigator.clipboard.writeText(registrationLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const handleSave = async () => {
    if (!generatedCode || !collegeName.trim()) return
    setIsSaving(true)
    setMessage("")
    const result = await saveCandidateSourceLink({
      sourceCode: generatedCode,
      sourceName: collegeName.trim(),
      sourceType: "college",
      campaign: campaign.trim() || undefined,
    })
    setIsSaving(false)
    if (!result.success) {
      setMessage(result.error || "Unable to save link")
      return
    }
    setMessage("Saved. You can copy this link later from Source Summary.")
    router.refresh()
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
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={handleSave} disabled={!generatedCode || !collegeName.trim() || isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save
            </Button>
            <Button type="button" onClick={handleCopy} disabled={!generatedCode}>
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  )
}