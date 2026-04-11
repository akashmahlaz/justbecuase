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
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="overflow-hidden rounded-3xl shadow-2xl">
          <div className="relative h-80 sm:h-96 md:h-112 lg:h-128">
            <Image
              src="/cta-img01.jpg"
              alt="Join the movement"
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 md:p-12 lg:p-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4 max-w-2xl text-balance">
                {home.ctaTitle || "Your Skills Can Change Lives. Start Today."}
              </h2>
              <p className="text-white/80 text-sm sm:text-base md:text-lg mb-6 md:mb-8 max-w-xl">
                {home.ctaDesc || "Join thousands of skilled professionals using their expertise to support causes they care about."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-11 sm:h-12 px-6 sm:px-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
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
                  className="h-11 sm:h-12 px-6 sm:px-8 font-semibold rounded-full border-white/40 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
                >
                  <LocaleLink href="/for-ngos">{home.ctaPartnerNGO || "Partner as an NGO"}</LocaleLink>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
