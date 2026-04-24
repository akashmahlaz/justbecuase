"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Building2, User, Sparkles, Zap, Loader2 } from "lucide-react"
import { client } from "@/lib/auth-client"
import { useSubscriptionStore, usePlatformSettingsStore } from "@/lib/store"
import { formatPrice, getCurrencySymbol } from "@/lib/currency"
import type { SupportedCurrency } from "@/lib/types"
import { PricingPageSkeleton } from "@/components/ui/page-skeletons"
import { useDictionary } from "@/components/dictionary-provider"

export default function PricingPage() {
  const dict = useDictionary()
  const p = (dict as any).pricing || {}
  const router = useRouter()
  const locale = useLocale()
  const { data: session } = client.useSession()
  const user = session?.user
  const userRole = user?.role as string | undefined
  
  // Zustand subscription store
  const { 
    ngoSubscription, 
    volunteerSubscription, 
  } = useSubscriptionStore()

  // Platform settings from Zustand store
  const { settings: platformSettings, isLoaded: settingsLoaded, setSettings, setLoaded } = usePlatformSettingsStore()
  const [settingsError, setSettingsError] = useState(false)
  
  // Fetch platform settings on mount (with TTL-based refresh)
  useEffect(() => {
    const shouldFetch = (!settingsLoaded || usePlatformSettingsStore.getState().needsRefresh()) && !settingsError
    if (shouldFetch) {
      fetch("/api/settings")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSettings(data.data)
          }
          setLoaded(true)
        })
        .catch(() => {
          setSettingsError(true)
          setLoaded(true)
        })
    }
  }, [settingsLoaded, settingsError, setSettings, setLoaded])
  
  // Default tab based on user role
  const defaultTab = userRole === "volunteer" ? "volunteer" : "ngo"
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  
  // Get current plan from store
  const currentNGOPlan = ngoSubscription?.plan || "free"
  const currentVolunteerPlan = volunteerSubscription?.plan || "free"

  // Get currency from admin settings
  const currency = (platformSettings?.currency || "INR") as SupportedCurrency
  const currencySymbol = getCurrencySymbol(currency)

  // Get admin-configured prices (whole currency units, e.g., 2999 = ₹2,999)
  const ngoProPrice = platformSettings?.ngoProPrice ?? 2999
  const volunteerProPrice = platformSettings?.volunteerProPrice ?? 999
  const ngoProYearlyPrice = platformSettings?.ngoProYearlyPrice ?? Math.round(ngoProPrice * 10)
  const volunteerProYearlyPrice = platformSettings?.volunteerProYearlyPrice ?? Math.round(volunteerProPrice * 10)
  
  // Calculate savings percentages
  const ngoYearlySavingsPercent = Math.round((1 - ngoProYearlyPrice / (ngoProPrice * 12)) * 100)
  const volunteerYearlySavingsPercent = Math.round((1 - volunteerProYearlyPrice / (volunteerProPrice * 12)) * 100)
  
  // Show only the plans relevant to the user's role
  // If user is logged in as volunteer, they can only see/buy volunteer plans
  // If user is logged in as Enterprise, they can only see/buy Enterprise plans
  // If not logged in, show both tabs for browsing
  const showBothTabs = !user || (userRole !== "volunteer" && userRole !== "ngo")
  const forcedTab = userRole === "volunteer" ? "volunteer" : userRole === "ngo" ? "ngo" : null
  
  // Build dynamic plans from settings
  const ngoPlans = [
    {
      id: "ngo-free",
      name: p.free || "Free",
      description: p.ngoFreeDesc || "Perfect for small Enterprises just getting started",
      price: 0,
      priceDisplay: `${currencySymbol}0`,
      period: p.forever || "forever",
      savingsPercent: 0,
      icon: Building2,
      features: (p.ngoFreeFeatures || [
        `Post up to ${platformSettings?.ngoFreeProjectsPerMonth || 3} projects per month`,
        "Browse candidate profiles",
        "View paid candidate profiles",
        "Basic candidate matching",
        "Email support",
      ]).map((f: string) => f.replace("{count}", String(platformSettings?.ngoFreeProjectsPerMonth || 3))),
      limitations: p.ngoFreeLimitations || [
        "Cannot unlock FREE candidate profiles",
        "Upgrade to Pro to unlock candidates",
      ],
      popular: false,
    },
    {
      id: "ngo-pro",
      name: p.pro || "Pro",
      description: p.ngoProDesc || "Unlock unlimited FREE candidate profiles",
      price: billingCycle === "yearly" ? ngoProYearlyPrice : ngoProPrice,
      priceDisplay: formatPrice(billingCycle === "yearly" ? ngoProYearlyPrice : ngoProPrice, currency),
      period: billingCycle === "yearly" ? (p.perYear || "per year") : (p.perMonth || "per month"),
      savingsPercent: billingCycle === "yearly" ? ngoYearlySavingsPercent : 0,
      icon: Zap,
      features: platformSettings?.ngoProFeatures || p.ngoProFeaturesDefault || [
        "Unlimited jobs",
        "Unlock UNLIMITED free candidate profiles",
        "View all paid candidate profiles",
        "Advanced AI-powered matching",
        "Priority support",
        "Job analytics & reports",
        "Featured Enterprise badge",
      ],
      limitations: [],
      popular: true,
    },
  ]

  const volunteerPlans = [
    {
      id: "volunteer-free",
      name: p.free || "Free",
      description: p.volFreeDesc || "Start contributing and make an impact",
      price: 0,
      priceDisplay: `${currencySymbol}0`,
      period: p.forever || "forever",
      savingsPercent: 0,
      icon: User,
      features: (p.volFreeFeatures || [
        "Browse all jobs",
        `${platformSettings?.volunteerFreeApplicationsPerMonth || 3} applications per month`,
        "Basic profile visibility",
        "Email notifications",
        "Community access",
      ]).map((f: string) => f.replace("{count}", String(platformSettings?.volunteerFreeApplicationsPerMonth || 3))),
      limitations: (p.volFreeLimitations || [
        `Limited to ${platformSettings?.volunteerFreeApplicationsPerMonth || 3} applications/month`,
      ]).map((f: string) => f.replace("{count}", String(platformSettings?.volunteerFreeApplicationsPerMonth || 3))),
      popular: false,
    },
    {
      id: "volunteer-pro",
      name: p.pro || "Pro",
      description: p.volProDesc || "Apply to unlimited jobs",
      price: billingCycle === "yearly" ? volunteerProYearlyPrice : volunteerProPrice,
      priceDisplay: formatPrice(billingCycle === "yearly" ? volunteerProYearlyPrice : volunteerProPrice, currency),
      period: billingCycle === "yearly" ? (p.perYear || "per year") : (p.perMonth || "per month"),
      savingsPercent: billingCycle === "yearly" ? volunteerYearlySavingsPercent : 0,
      icon: Sparkles,
      features: platformSettings?.volunteerProFeatures || p.volProFeaturesDefault || [
        "Unlimited job applications",
        "Featured profile badge",
        "Priority in search results",
        "Direct message Enterprises",
        "Early access to jobs",
        "Profile analytics",
        "Certificate downloads",
      ],
      limitations: [],
      popular: true,
    },
  ]

  const handleSubscribe = (planId: string, amount: number) => {
    if (!user) {
      router.push(localePath(`/auth/signin?redirect=/checkout?plan=${planId}&billing=${billingCycle}`, locale))
      return
    }

    if (amount === 0) {
      // Free plan - just redirect to appropriate dashboard
      router.push(localePath(userRole === "ngo" ? "/ngo/dashboard" : "/volunteer/dashboard", locale))
      return
    }

    // Redirect to checkout page
    router.push(localePath(`/checkout?plan=${planId}&billing=${billingCycle}`, locale))
  }

  const renderPlanCard = (plan: typeof ngoPlans[0], currentPlan?: string) => {
    const Icon = plan.icon
    const isCurrentPlan = currentPlan === plan.id || (currentPlan === undefined && plan.price === 0)
    const isLoading = loadingPlan === plan.id

    return (
      <Card 
        key={plan.id}
        className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg scale-[1.02]" : ""}`}
      >
        {plan.popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
            <Badge className="bg-primary text-primary-foreground">
              {p.recommended || "Recommended"}
            </Badge>
            {plan.savingsPercent > 0 && (
              <Badge className="bg-green-600 text-white">
                Save {plan.savingsPercent}%
              </Badge>
            )}
          </div>
        )}
        <CardHeader>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription>{plan.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="mb-6">
            <span className="text-4xl font-bold text-foreground">{plan.priceDisplay}</span>
            <span className="text-muted-foreground ml-2">/{plan.period}</span>
          </div>
          <ul className="space-y-3">
            {plan.features.map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
          {plan.limitations.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">{p.limitations || "Limitations:"}</p>
              {plan.limitations.map((limit: string, i: number) => (
                <p key={i} className="text-xs text-amber-600">{limit}</p>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full" 
            variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
            disabled={isCurrentPlan || isLoading}
            onClick={() => handleSubscribe(plan.id, plan.price)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {p.processing || "Processing..."}
              </>
            ) : isCurrentPlan ? (
              p.currentPlan || "Current Plan"
            ) : plan.price === 0 ? (
              p.getStartedFree || "Get Started Free"
            ) : (
              (p.upgradeTo || "Upgrade to {plan}").replace("{plan}", plan.name)
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Header */}
        <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <Badge className="mb-4">{p.badge || "Pricing"}</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {p.title || "Simple, transparent pricing"}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {p.subtitle || "Choose the perfect plan for your needs. Upgrade anytime."}
            </p>
          </div>
        </section>

        {/* Loading state */}
        {!settingsLoaded && (
          <PricingPageSkeleton />
        )}

        {/* Pricing Tabs */}
        {settingsLoaded && (
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            {/* Show message if user is logged in - they can only upgrade their own plan type */}
            {user && forcedTab && (
              <div className="text-center mb-8 p-4 bg-muted/50 rounded-lg max-w-2xl mx-auto">
                <p className="text-muted-foreground">
                  {(p.loggedInAs || "You're logged in as {role}.").replace("{role}", userRole === "ngo" ? (p.anNGO || "an Enterprise") : (p.anImpactAgent || "an candidate"))}
                  {" "}
                  {userRole === "ngo" 
                    ? (p.ngoUpgradeHint || "Upgrade your Enterprise subscription below.")
                    : (p.volunteerUpgradeHint || "Upgrade your candidate subscription below.")}
                </p>
              </div>
            )}
            
            <Tabs value={forcedTab || activeTab} onValueChange={showBothTabs ? setActiveTab : undefined} className="w-full">
              {/* Only show tabs if user is not logged in OR is admin */}
              {showBothTabs && (
                <div className="flex justify-center mb-12">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="ngo" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {p.forNGOs || "For Enterprises"}
                    </TabsTrigger>
                    <TabsTrigger value="volunteer" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {p.forImpactAgents || "For Candidates"}
                    </TabsTrigger>
                  </TabsList>
                </div>
              )}

              <TabsContent value="ngo">
                <div className="flex justify-center mb-8">
                  <div className="inline-flex items-center rounded-lg border bg-muted p-1">
                    <button
                      onClick={() => setBillingCycle("monthly")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        billingCycle === "monthly"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.monthly || "Monthly"}
                    </button>
                    <button
                      onClick={() => setBillingCycle("yearly")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        billingCycle === "yearly"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.yearly || "Yearly"}
                      {ngoYearlySavingsPercent > 0 && (
                        <span className="ml-1.5 text-xs text-green-600 font-semibold">Save {ngoYearlySavingsPercent}%</span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {ngoPlans.map((plan) => renderPlanCard(plan, currentNGOPlan === "pro" ? "ngo-pro" : undefined))}
                </div>
                
                <div className="mt-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    {p.contactSalesDesc || "Need a custom solution for your large organization?"}
                  </p>
                  <Button variant="outline" asChild>
                    <a href={localePath("/contact?source=pricing", locale)}>{p.contactSales || "Contact Sales"}</a>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="volunteer">
                <div className="flex justify-center mb-8">
                  <div className="inline-flex items-center rounded-lg border bg-muted p-1">
                    <button
                      onClick={() => setBillingCycle("monthly")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        billingCycle === "monthly"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.monthly || "Monthly"}
                    </button>
                    <button
                      onClick={() => setBillingCycle("yearly")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        billingCycle === "yearly"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.yearly || "Yearly"}
                      {volunteerYearlySavingsPercent > 0 && (
                        <span className="ml-1.5 text-xs text-green-600 font-semibold">Save {volunteerYearlySavingsPercent}%</span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {volunteerPlans.map((plan) => renderPlanCard(plan, currentVolunteerPlan === "pro" ? "volunteer-pro" : undefined))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
        )}

        {/* FAQ Section */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">{p.faq || "Frequently Asked Questions"}</h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">{p.faqProfileUnlock || "What is a profile unlock? (Enterprises)"}</h3>
                <p className="text-muted-foreground">
                  {p.faqProfileUnlockAnswer || "All Enterprises can browse and view candidate profiles for free. Enterprise Pro subscribers get additional features like priority matching and advanced filters."}
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">{p.faqApplication || "What counts as an application? (Candidates)"}</h3>
                <p className="text-muted-foreground">
                  {(p.faqApplicationAnswer || "Each time you apply to a project/opportunity, it counts as one application. Free plan includes {count} applications per month.").replace("{count}", String(platformSettings?.volunteerFreeApplicationsPerMonth || 3))}
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">{p.faqChangePlan || "Can I change plans anytime?"}</h3>
                <p className="text-muted-foreground">
                  {p.faqChangePlanAnswer || "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately."}
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">{p.faqRollover || "Do unused limits roll over?"}</h3>
                <p className="text-muted-foreground">
                  {p.faqRolloverAnswer || "No, unused applications or unlocks do not roll over to the next month. Counters reset on the 1st of each month."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
