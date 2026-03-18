"use client"

import { ArrowRight, Heart } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"
import LocaleLink from "@/components/locale-link"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { BorderBeam } from "@/components/ui/border-beam"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Button } from "@/components/ui/button"

export function CTASection() {
  const dict = useDictionary()
  const home = dict.home || {}

  const stats = [
    { value: 120, suffix: "+", label: home.ctaStat4Label || "Partner NGOs" },
    { value: 0, suffix: "%", label: home.ctaStat2Label || "Registration Fees" },
    { value: 24, suffix: "/7", label: home.ctaStat3Label || "Support available" },
    { value: 5, suffix: " min", label: home.ctaStat1Label || "To sign up" },
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-12 lg:p-16">
          {/* Border beam effect */}
          <BorderBeam size={300} duration={8} />

          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-primary-foreground mb-6">
                <Heart className="h-4 w-4" fill="currentColor" />
                <span>{home.ctaReadyBadge || "Ready to make a difference?"}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 text-balance">
                {home.ctaTitle || "Your Skills Can Change Lives. Start Today."}
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8">
                {home.ctaDesc || "Join thousands of skilled professionals who are using their expertise to support causes they care about. It takes just 5 minutes to get started."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <LocaleLink href="/auth/signup">
                  <ShimmerButton className="h-12 px-8 text-base font-semibold" background="white" shimmerColor="hsl(var(--primary))">
                    <span className="flex items-center gap-2 text-primary">
                      {home.ctaButton || "Join as an Impact Agent"}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </ShimmerButton>
                </LocaleLink>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 h-12 px-8 font-semibold rounded-4xl text-primary-foreground hover:bg-white/10 bg-transparent"
                >
                  <LocaleLink href="/for-ngos">{home.ctaPartnerNGO || "Partner as an NGO"}</LocaleLink>
                </Button>
              </div>
            </div>

            <div className="hidden md:flex justify-center">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="p-6 rounded-2xl bg-white/10 text-center">
                    <div className="text-2xl font-bold text-primary-foreground">
                      <NumberTicker value={stat.value} className="text-primary-foreground" />
                      {stat.suffix}
                    </div>
                    <div className="text-sm text-primary-foreground/70">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
