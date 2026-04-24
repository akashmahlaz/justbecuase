"use client"

import { useState, useEffect } from "react"
import { useDictionary } from "@/components/dictionary-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { generateReferralCode, getReferralStats } from "@/lib/actions"
import { Copy, Check, Users, Gift, Share2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import { ReferralsSkeleton } from "@/components/ui/page-skeletons"

export default function ReferralPage() {
  const router = useRouter()
  const locale = useLocale()
  const dict = useDictionary()
  const { data: session, isPending } = authClient.useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [referralCode, setReferralCode] = useState("")
  const [stats, setStats] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!session?.user) return
      try {
        const statsResult = await getReferralStats()
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data)
          if (statsResult.data.codes?.length > 0) {
            setReferralCode(statsResult.data.codes[0])
          }
        }
      } catch (err) {
        console.error("Failed to load referral stats:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isPending && session?.user) {
      const user = session.user as any
      if (user.role !== "volunteer") {
        router.push(localePath(user.role === "ngo" ? "/ngo/dashboard" : "/auth/role-select", locale))
        return
      }
      if (!user.isOnboarded) {
        router.push(localePath("/volunteer/onboarding", locale))
        return
      }
      loadData()
    } else if (!isPending && !session?.user) {
      router.push(localePath("/auth/signin", locale))
    }
  }, [session, isPending, router])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const result = await generateReferralCode()
      if (result.success && result.data) {
        setReferralCode(result.data)
        toast.success("Referral code generated!")
      } else {
        toast.error(result.error || "Failed to generate code")
      }
    } catch {
      toast.error("Failed to generate referral code")
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    const url = `${window.location.origin}/auth/signup?ref=${referralCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Referral link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const url = `${window.location.origin}/auth/signup?ref=${referralCode}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: dict.volunteer?.referrals?.shareTitle || "Join JustBeCause Network",
          text: dict.volunteer?.referrals?.shareText || "Join me on JustBeCause — connect with NGOs and make a real impact!",
          url,
        })
      } catch {}
    } else {
      handleCopy()
    }
  }

  if (isPending || isLoading) {
    return <ReferralsSkeleton />
  }

  const userName = session?.user?.name || "Volunteer"
  const userAvatar = (session?.user as any)?.image || undefined

  return (
    <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">{dict.volunteer?.referrals?.title || "Refer & Earn"}</h1>
              <p className="text-muted-foreground">
                {dict.volunteer?.referrals?.subtitle || "Invite friends to JustBeCause — grow the impact community!"}
              </p>
            </div>

            {/* Referral Link */}
            <Card className="mb-8 border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  {dict.volunteer?.referrals?.yourReferralLink || "Your Referral Link"}
                </CardTitle>
                <CardDescription>
                  {dict.volunteer?.referrals?.linkDesc || "Share this link with friends who want to make a difference"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referralCode ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${referralCode}`}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={handleCopy}
                        className="shrink-0 gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" /> {dict.volunteer?.common?.copied || "Copied"}
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" /> {dict.volunteer?.common?.copy || "Copy"}
                          </>
                        )}
                      </Button>
                    </div>
                    <Button onClick={handleShare} className="w-full gap-2">
                      <Share2 className="h-4 w-4" />
                      {dict.volunteer?.referrals?.shareReferralLink || "Share Referral Link"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {dict.volunteer?.referrals?.generating || "Generating..."}
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4" />
                        {dict.volunteer?.referrals?.generateCode || "Generate Your Referral Code"}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats?.signedUp || 0}</p>
                  <p className="text-xs text-muted-foreground">{dict.volunteer?.referrals?.peopleSignedUp || "People Signed Up"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats?.completed || 0}</p>
                  <p className="text-xs text-muted-foreground">{dict.volunteer?.referrals?.completedOnboarding || "Completed Onboarding"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Gift className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats?.totalReferrals || 0}</p>
                  <p className="text-xs text-muted-foreground">{dict.volunteer?.referrals?.referralCodes || "Referral Codes"}</p>
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>{dict.volunteer?.referrals?.howItWorks || "How Referrals Work"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-lg font-bold text-primary">1</span>
                    </div>
                    <h4 className="font-medium text-sm mb-1">{dict.volunteer?.referrals?.step1Title || "Share Your Link"}</h4>
                    <p className="text-xs text-muted-foreground">
                      {dict.volunteer?.referrals?.step1Desc || "Send your unique referral link to friends and colleagues"}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-lg font-bold text-primary">2</span>
                    </div>
                    <h4 className="font-medium text-sm mb-1">{dict.volunteer?.referrals?.step2Title || "They Sign Up"}</h4>
                    <p className="text-xs text-muted-foreground">
                      {dict.volunteer?.referrals?.step2Desc || "When they create an account using your link, you both benefit"}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-lg font-bold text-primary">3</span>
                    </div>
                    <h4 className="font-medium text-sm mb-1">{dict.volunteer?.referrals?.step3Title || "Earn Badges"}</h4>
                    <p className="text-xs text-muted-foreground">
                      {dict.volunteer?.referrals?.step3Desc || "Get special referral badges and help grow the community"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
    </main>
  )
}
