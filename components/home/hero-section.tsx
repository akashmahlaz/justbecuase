"use client"

import Image from "next/image"
import { useDictionary } from "@/components/dictionary-provider"
import { usePlatformSettingsStore } from "@/lib/store"

export function HeroSection() {
  const dict = useDictionary()
  const hero = dict.hero || {}
  const platformSettings = usePlatformSettingsStore((state) => state.settings)
  const platformName = platformSettings?.platformName || "JustBeCause Network"

  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-6 md:pt-24 md:pb-8 lg:pt-28 lg:pb-10">
      {/* Minimal background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-40 -left-20 h-64 w-64 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — Text Content */}
          <div className="text-center lg:text-left">

            {/* Main Headline - MISSION IMPOSSIBLE */}
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {hero.missionLine || "MISSION"} <span className="line-through decoration-2 text-muted-foreground/60">{hero.im || "IM"}</span><span className="text-primary">{hero.possible || "POSSIBLE"}</span>
            </h1>

            {/* Tagline */}
            <p className="mx-auto mb-6 max-w-xl text-lg text-foreground font-medium lg:mx-0">
              {(hero.tagline || "You've spent years perfecting your {skill}; now, give it a {purpose}.")
                .split(/(\{skill\}|\{purpose\})/g)
                .map((part: string, i: number) => {
                  if (part === "{skill}") return <span key={i} className="font-bold">{hero.skill || "skill"}</span>;
                  if (part === "{purpose}") return <span key={i} className="font-bold">{hero.purpose || "purpose"}</span>;
                  return part;
                })}
            </p>

            {/* Description */}
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground leading-relaxed lg:mx-0">
              {hero.description ? (
                hero.description.split("{platformName}").map((part: string, i: number, arr: string[]) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="font-semibold text-foreground">{platformName}</span>}
                  </span>
                ))
              ) : (
                <>
                  Across the globe, visionary NGOs are working tirelessly to change lives, but they shouldn&apos;t have to do it alone.
                  They have the passion, but they need your professional expertise to break through.
                  <span className="font-semibold text-foreground"> {platformName}</span> is the bridge between your talent and their impact.
                  We believe that when your mastery meets their mission, the impossible becomes possible.
                </>
              )}
            </p>

          </div>

          {/* Right — Hero Image */}
          <div className="hidden lg:flex justify-center items-center relative">
            {/* Glow behind image */}
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-75" />

            {/* Main image card */}
            <div className="relative w-96 h-96 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/50">
              <Image
                src="/hero-img01.jpg"
                alt="Hero"
                fill
                className="object-cover"
                sizes="384px"
                priority
              />
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-background/20 to-transparent" />
            </div>

            {/* Floating accent badge — bottom left */}
            <div className="absolute -bottom-4 -left-4 px-5 py-3 rounded-2xl bg-background/80 backdrop-blur-md border border-border shadow-lg">
              <div className="text-sm font-semibold text-foreground">Impact Agents</div>
              <div className="text-xs text-muted-foreground">Making a difference</div>
            </div>

            {/* Floating accent badge — top right */}
            <div className="absolute -top-4 -right-4 px-5 py-3 rounded-2xl bg-primary/10 backdrop-blur-md border border-primary/20 shadow-lg">
              <div className="text-sm font-semibold text-primary">NGOs</div>
              <div className="text-xs text-primary/70">Actively hiring</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
