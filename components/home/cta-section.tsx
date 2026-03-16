"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Heart } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"
import LocaleLink from "@/components/locale-link"

export function CTASection() {
  const dict = useDictionary()
  const home = dict.home || {}

  const stats = [
    { value: home.ctaStat1Value || "1 min", label: home.ctaStat1Label || "To sign up" },
    { value: home.ctaStat2Value || "0%", label: home.ctaStat2Label || "Registration Fees" },
    { value: home.ctaStat3Value || "24/7", label: home.ctaStat3Label || "Support available" },
    { value: home.ctaStat4Value || "120+", label: home.ctaStat4Label || "Partner NGOs" },
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-12 lg:p-16">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
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
                <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  <LocaleLink href="/auth/signup" className="flex items-center gap-2">
                    {home.ctaButton || "Join as an Impact Agent"}
                    <ArrowRight className="h-4 w-4" />
                  </LocaleLink>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-primary-foreground hover:bg-white/10 bg-transparent"
                >
                  <LocaleLink href="/for-ngos">{home.ctaPartnerNGO || "Partner as an NGO"}</LocaleLink>
                </Button>
              </div>
            </div>

            <div className="hidden md:flex justify-center">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="p-6 rounded-2xl bg-white/10 text-center">
                    <div className="text-2xl font-bold text-primary-foreground">{stat.value}</div>
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
