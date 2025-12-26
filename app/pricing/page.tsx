"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Building2, User, Sparkles, Zap, Loader2 } from "lucide-react"
import { client } from "@/lib/auth-client"
import { toast } from "sonner"
import { useSubscriptionStore, usePlatformSettingsStore } from "@/lib/store"
import type { SupportedCurrency } from "@/lib/types"

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  SGD: "S$",
  AED: "د.إ",
  MYR: "RM",
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function PricingPage() {
  const { data: session } = client.useSession()
  const user = session?.user
  const userRole = user?.role as string | undefined
  
  // Zustand subscription store
  const { 
    ngoSubscription, 
    volunteerSubscription, 
    setNGOSubscription, 
    setVolunteerSubscription 
  } = useSubscriptionStore()

  // Platform settings from Zustand store
  const { settings: platformSettings, isLoaded: settingsLoaded, setSettings, setLoaded } = usePlatformSettingsStore()
  const [settingsError, setSettingsError] = useState(false)
  
  // Fetch platform settings on mount
  useEffect(() => {
    if (!settingsLoaded && !settingsError) {
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
  
  // Get current plan from store
  const currentNGOPlan = ngoSubscription?.plan || "free"
  const currentVolunteerPlan = volunteerSubscription?.plan || "free"

  // Get currency symbol
  const currency = (platformSettings?.currency || "INR") as SupportedCurrency
  const currencySymbol = CURRENCY_SYMBOLS[currency] || "₹"
  
  // Show only the plans relevant to the user's role
  // If user is logged in as volunteer, they can only see/buy volunteer plans
  // If user is logged in as NGO, they can only see/buy NGO plans
  // If not logged in, show both tabs for browsing
  const showBothTabs = !user || (userRole !== "volunteer" && userRole !== "ngo")
  const forcedTab = userRole === "volunteer" ? "volunteer" : userRole === "ngo" ? "ngo" : null
  
  // Build dynamic plans from settings
  const ngoPlans = [
    {
      id: "ngo-free",
      name: "Free",
      description: "Perfect for small NGOs just getting started",
      price: 0,
      priceDisplay: `${currencySymbol}0`,
      period: "forever",
      icon: Building2,
      features: [
        `Post up to ${platformSettings?.ngoFreeProjectsPerMonth || 3} projects per month`,
        "Browse volunteer profiles",
        "Basic volunteer matching",
        "Email support",
        "Community access",
      ],
      limitations: [
        platformSettings?.ngoFreeProfileUnlocksPerMonth === 0
          ? `Pay-per-unlock available (${currencySymbol}${platformSettings?.singleProfileUnlockPrice || 499}/profile)`
          : `${platformSettings?.ngoFreeProfileUnlocksPerMonth || 0} free profile unlocks/month`,
      ],
      popular: false,
    },
    {
      id: "ngo-pro",
      name: "Pro",
      description: "For established organizations with regular needs",
      price: platformSettings?.ngoProPrice || 2999,
      priceDisplay: `${currencySymbol}${platformSettings?.ngoProPrice || 2999}`,
      period: "per month",
      icon: Zap,
      features: platformSettings?.ngoProFeatures || [
        "Unlimited projects",
        "Unlimited profile unlocks",
        "Advanced AI-powered matching",
        "Priority support",
        "Project analytics & reports",
        "Featured NGO badge",
        "Bulk volunteer outreach",
      ],
      limitations: [],
      popular: true,
    },
  ]

  const volunteerPlans = [
    {
      id: "volunteer-free",
      name: "Free",
      description: "Start volunteering and make an impact",
      price: 0,
      priceDisplay: `${currencySymbol}0`,
      period: "forever",
      icon: User,
      features: [
        "Browse all opportunities",
        `${platformSettings?.volunteerFreeApplicationsPerMonth || 3} applications per month`,
        "Basic profile visibility",
        "Email notifications",
        "Community access",
      ],
      limitations: [
        `Limited to ${platformSettings?.volunteerFreeApplicationsPerMonth || 3} applications/month`,
      ],
      popular: false,
    },
    {
      id: "volunteer-pro",
      name: "Pro",
      description: "Maximize your impact with unlimited access",
      price: platformSettings?.volunteerProPrice || 999,
      priceDisplay: `${currencySymbol}${platformSettings?.volunteerProPrice || 999}`,
      period: "per month",
      icon: Sparkles,
      features: platformSettings?.volunteerProFeatures || [
        "Unlimited job applications",
        "Featured profile badge",
        "Priority in search results",
        "Direct message NGOs",
        "Early access to opportunities",
        "Profile analytics",
        "Certificate downloads",
      ],
      limitations: [],
      popular: true,
    },
  ]

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleSubscribe = async (planId: string, amount: number, planName: string) => {
    if (!user) {
      window.location.href = "/auth/signin?redirect=/pricing"
      return
    }

    if (amount === 0) {
      // Free plan - just redirect to appropriate dashboard
      window.location.href = userRole === "ngo" ? "/ngo/dashboard" : "/volunteer/dashboard"
      return
    }

    setLoadingPlan(planId)

    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        alert("Failed to load payment gateway")
        return
      }

      // Create subscription order
      const response = await fetch("/api/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, amount }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create order")
      }

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: "JustBecause.asia",
        description: `${planName} Plan Subscription`,
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch("/api/payments/verify-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId,
              }),
            })

            const verifyData = await verifyResponse.json()
            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || "Payment verification failed")
            }

            // Update Zustand store with new subscription
            const expiryDate = new Date()
            expiryDate.setMonth(expiryDate.getMonth() + 1)
            
            if (planId.startsWith("ngo-")) {
              setNGOSubscription({
                plan: planId === "ngo-pro" ? "pro" : "free",
                unlocksUsed: 0,
                expiryDate: expiryDate.toISOString(),
              })
            } else if (planId.startsWith("volunteer-")) {
              setVolunteerSubscription({
                plan: planId === "volunteer-pro" ? "pro" : "free",
                applicationsUsed: 0,
                expiryDate: expiryDate.toISOString(),
              })
            }

            // Show success toast immediately
            toast.success("🎉 Subscription activated!", {
              description: "Welcome to Pro! Enjoy unlimited access.",
            })
            
            // Redirect after a short delay to let toast show
            setTimeout(() => {
              window.location.href = userRole === "ngo" ? "/ngo/dashboard" : "/volunteer/dashboard"
            }, 1500)
          } catch (error: any) {
            toast.error("Payment failed", {
              description: error.message || "Payment verification failed",
            })
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: { color: "#0ea5e9" },
        modal: {
          ondismiss: () => setLoadingPlan(null),
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error: any) {
      toast.error("Payment error", {
        description: error.message || "Failed to initiate payment",
      })
    } finally {
      setLoadingPlan(null)
    }
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
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground">
              Recommended
            </Badge>
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
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
          {plan.limitations.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Limitations:</p>
              {plan.limitations.map((limit, i) => (
                <p key={i} className="text-xs text-amber-600">{limit}</p>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
            disabled={isCurrentPlan || isLoading}
            onClick={() => handleSubscribe(plan.id, plan.price, plan.name)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isCurrentPlan ? (
              "Current Plan"
            ) : plan.price === 0 ? (
              "Get Started Free"
            ) : (
              `Upgrade to ${plan.name}`
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
            <Badge className="mb-4">Pricing</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your needs. Upgrade anytime.
            </p>
          </div>
        </section>

        {/* Loading state */}
        {!settingsLoaded && (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Pricing Tabs */}
        {settingsLoaded && (
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            {/* Show message if user is logged in - they can only upgrade their own plan type */}
            {user && forcedTab && (
              <div className="text-center mb-8 p-4 bg-muted/50 rounded-lg max-w-2xl mx-auto">
                <p className="text-muted-foreground">
                  You're logged in as {userRole === "ngo" ? "an NGO" : "a volunteer"}. 
                  {userRole === "ngo" 
                    ? " Upgrade your NGO subscription below."
                    : " Upgrade your volunteer subscription below."}
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
                      For NGOs
                    </TabsTrigger>
                    <TabsTrigger value="volunteer" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      For Volunteers
                    </TabsTrigger>
                  </TabsList>
                </div>
              )}

              <TabsContent value="ngo">
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {ngoPlans.map((plan) => renderPlanCard(plan, currentNGOPlan === "pro" ? "ngo-pro" : undefined))}
                </div>
                
                <div className="mt-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Need a custom solution for your large organization?
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/contact">Contact Sales</a>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="volunteer">
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
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">What is a profile unlock? (NGOs)</h3>
                <p className="text-muted-foreground">
                  When you find a free volunteer you&apos;d like to connect with, you need to unlock their profile 
                  to view their contact information. {platformSettings?.ngoFreeProfileUnlocksPerMonth === 0 
                    ? `Free plan requires pay-per-unlock (${currencySymbol}${platformSettings?.singleProfileUnlockPrice || 499}/profile).`
                    : `Free plan includes ${platformSettings?.ngoFreeProfileUnlocksPerMonth} unlocks per month.`}
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">What counts as an application? (Volunteers)</h3>
                <p className="text-muted-foreground">
                  Each time you apply to a project/opportunity, it counts as one application. 
                  Free plan includes {platformSettings?.volunteerFreeApplicationsPerMonth || 3} applications per month.
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">Can I change plans anytime?</h3>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">Do unused limits roll over?</h3>
                <p className="text-muted-foreground">
                  No, unused applications or unlocks do not roll over to the next month. 
                  Counters reset on the 1st of each month.
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
