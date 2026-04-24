"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"
import LocaleLink from "@/components/locale-link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  const dict = useDictionary()
  const home = dict.home || {}

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

          {/* Image — clearly visible on white background */}
          <div className="relative">
            <div className="relative aspect-4/3 w-full rounded-3xl overflow-hidden shadow-xl ring-1 ring-border/30">
              <Image
                src="/cta-img01.jpg"
                alt="Join the movement"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 560px"
              />
            </div>
          </div>

          {/* Text content */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 text-balance">
              {home.ctaTitle || "Your Skills Can Change Lives. Start Today."}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-lg mx-auto md:mx-0">
              {home.ctaDesc || "Join thousands of skilled professionals who are using their expertise to support causes they care about. It takes just 5 minutes to get started."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 font-semibold rounded-full"
              >
                <LocaleLink href="/auth/signup">
                  {home.ctaButton || "Join as an Candidate"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </LocaleLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-8 font-semibold rounded-full"
              >
                <LocaleLink href="/for-ngos">{home.ctaPartnerNGO || "Partner as an Enterprise"}</LocaleLink>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
