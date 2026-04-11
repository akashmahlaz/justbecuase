"use client"

import Image from "next/image"
import { ArrowRight, Heart } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"
import LocaleLink from "@/components/locale-link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  const dict = useDictionary()
  const home = dict.home || {}

  const stats = [
    { value: "Global", label:"Worldwide Operating" },
    { value: "No", label: home.ctaStat2Label || "Registration Fees" },
    { value: "24/7", label: home.ctaStat3Label || "Support available" },
    { value: "5 min", label: home.ctaStat1Label || "To sign up" },
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-12 lg:p-16">
          {/* Decorative background glow */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            {/* Left — Text & Buttons */}
            <div className="order-2 md:order-1">
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
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-8 font-semibold bg-white text-primary hover:bg-white/90 rounded-full"
                >
                  <LocaleLink href="/auth/signup">
                    {home.ctaButton || "Join as an Impact Agent"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </LocaleLink>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 h-12 px-8 font-semibold rounded-full text-primary-foreground hover:bg-white/10 bg-transparent"
                >
                  <LocaleLink href="/for-ngos">{home.ctaPartnerNGO || "Partner as an NGO"}</LocaleLink>
                </Button>
              </div>
            </div>

            {/* Right — Image with floating stats */}
            <div className="order-1 md:order-2 flex justify-center items-center relative mb-4 md:mb-0">
              {/* White background card to separate image from primary bg */}
              <div className="relative rounded-3xl bg-white p-2.5 sm:p-3 shadow-2xl">
                <div className="relative w-52 h-60 sm:w-60 sm:h-68 md:w-64 md:h-72 rounded-2xl overflow-hidden">
                  <Image
                    src="/cta-img01.jpg"
                    alt="Join the movement"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 208px, (max-width: 768px) 240px, 256px"
                  />
                </div>
              </div>

              {/* Floating stats — top-right */}
              <div className="absolute -top-3 -right-2 sm:-top-4 sm:-right-4 p-3 sm:p-4 rounded-2xl bg-white shadow-xl text-center min-w-20 sm:min-w-28">
                <div className="text-lg sm:text-2xl font-bold text-primary">{stats[0].value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stats[0].label}</div>
              </div>

              {/* Floating stats — bottom-left */}
              <div className="absolute -bottom-3 -left-2 sm:-bottom-4 sm:-left-4 p-3 sm:p-4 rounded-2xl bg-white shadow-xl text-center min-w-20 sm:min-w-28">
                <div className="text-lg sm:text-2xl font-bold text-primary">{stats[1].value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stats[1].label}</div>
              </div>

              {/* Floating stats — bottom-right */}
              <div className="absolute -bottom-3 right-8 sm:-bottom-4 sm:right-12 p-3 sm:p-4 rounded-2xl bg-white shadow-xl text-center min-w-20 sm:min-w-28">
                <div className="text-lg sm:text-2xl font-bold text-primary">{stats[2].value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stats[2].label}</div>
              </div>

              {/* Floating stat — top-left */}
              <div className="absolute -top-3 left-4 sm:-top-4 sm:left-8 p-3 sm:p-4 rounded-2xl bg-white shadow-xl text-center min-w-20 sm:min-w-28">
                <div className="text-lg sm:text-2xl font-bold text-primary">{stats[3].value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stats[3].label}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
