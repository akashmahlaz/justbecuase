import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Star, Zap, Crown, Building2 } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    name: "Free",
    description: "Perfect for small NGOs just getting started",
    price: "₹0",
    period: "forever",
    icon: Building2,
    features: [
      "Post up to 3 projects",
      "5 free profile unlocks per month",
      "Basic volunteer matching",
      "Email support",
      "Community access",
    ],
    cta: "Current Plan",
    ctaVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Basic",
    description: "For growing organizations with regular needs",
    price: "₹2,999",
    period: "per month",
    icon: Star,
    features: [
      "Post up to 10 projects",
      "25 profile unlocks per month",
      "Advanced volunteer matching",
      "Priority support",
      "Project analytics",
      "Volunteer ratings & reviews",
    ],
    cta: "Upgrade to Basic",
    ctaVariant: "default" as const,
    popular: false,
  },
  {
    name: "Premium",
    description: "Best value for established organizations",
    price: "₹7,999",
    period: "per month",
    icon: Zap,
    features: [
      "Unlimited projects",
      "100 profile unlocks per month",
      "AI-powered matching",
      "Dedicated account manager",
      "Advanced analytics & reports",
      "Custom branding",
      "API access",
      "Bulk volunteer outreach",
    ],
    cta: "Upgrade to Premium",
    ctaVariant: "default" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom needs",
    price: "Custom",
    period: "contact us",
    icon: Crown,
    features: [
      "Everything in Premium",
      "Unlimited profile unlocks",
      "White-label solution",
      "Custom integrations",
      "Onboarding & training",
      "SLA guarantee",
      "Multiple team members",
      "Volume discounts",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    popular: false,
  },
]

export default function PricingPage() {
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
              Choose the perfect plan for your organization. All plans include our core features.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const Icon = plan.icon
                return (
                  <Card 
                    key={plan.name}
                    className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          Most Popular
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
                        <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-muted-foreground ml-2">/{plan.period}</span>
                      </div>
                      <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        variant={plan.ctaVariant}
                        asChild
                      >
                        <Link href={plan.name === "Enterprise" ? "/contact" : "/ngo/settings?tab=billing"}>
                          {plan.cta}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">What is a profile unlock?</h3>
                <p className="text-muted-foreground">
                  When you find a free volunteer you&apos;d like to connect with, you need to unlock their profile 
                  to view their contact information and send them a message. Each plan includes a monthly quota.
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">Can I change plans anytime?</h3>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">Do unused unlocks roll over?</h3>
                <p className="text-muted-foreground">
                  Unused profile unlocks do not roll over to the next month. We recommend using them before your cycle renews.
                </p>
              </div>
              
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold text-foreground mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground">
                  Our Free plan is always available! You can use it forever with no credit card required. 
                  Premium plans also come with a 14-day money-back guarantee.
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
