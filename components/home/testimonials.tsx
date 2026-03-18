"use client"

import {
  featuredTestimonial,
  testimonialRow1,
  testimonialRow2,
  type Testimonial,
} from "@/lib/data"
import { Star } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"
import { Marquee } from "@/components/ui/marquee"
import { Highlighter } from "@/components/ui/highlighter"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { MagicCard } from "@/components/ui/magic-card"

/* ── Helper: render quote with highlighted fragment ── */

function HighlightedQuote({
  quote,
  highlight,
  color = "#fde68a",
}: {
  quote: string
  highlight: string
  color?: string
}) {
  const idx = quote.indexOf(highlight)
  if (idx === -1) return <>&ldquo;{quote}&rdquo;</>
  return (
    <>
      &ldquo;{quote.slice(0, idx)}
      <Highlighter action="highlight" color={color} animationDuration={800} isView>
        {highlight}
      </Highlighter>
      {quote.slice(idx + highlight.length)}&rdquo;
    </>
  )
}

/* ── Star rating ── */

function Stars({ size = "sm" }: { size?: "sm" | "lg" }) {
  const s = size === "lg" ? "size-5" : "size-3.5"
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${s} fill-amber-400 text-amber-400`} />
      ))}
    </div>
  )
}

/* ── Avatar with image fallback to initials ── */

function Avatar({
  name,
  image,
  size = "sm",
}: {
  name: string
  image: string
  size?: "sm" | "lg"
}) {
  const dim = size === "lg" ? "size-14" : "size-11"
  const ring = size === "lg" ? "ring-4" : "ring-2"
  const textSize = size === "lg" ? "text-sm" : "text-[11px]"
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
  return (
    <div className={`relative ${dim}`}>
      <img
        src={image}
        alt={name}
        className={`${dim} rounded-full object-cover ${ring} ring-muted bg-muted`}
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = "none"
          const next = target.nextElementSibling
          if (next instanceof HTMLElement) next.style.display = "flex"
        }}
      />
      <div
        className={`${dim} items-center justify-center rounded-full bg-primary text-primary-foreground ${textSize} font-bold tracking-wider ${ring} ring-muted hidden`}
      >
        {initials}
      </div>
    </div>
  )
}

/* ── Tweet-card style Testimonial (used inside marquee) ── */

function TestimonialCard({ quote, highlight, author, role, organization, avatar, tag, type }: Testimonial) {
  return (
    <MagicCard className="w-90 rounded-2xl border border-border bg-card p-7 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-500" gradientSize={150} gradientOpacity={0.15}>
      {/* Top row: avatar + info + tag */}
      <div className="flex items-start gap-3.5 mb-5">
        <Avatar name={author} image={avatar} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground truncate">{author}</p>
          <p className="text-[11px] text-muted-foreground truncate">{organization}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground/50">
          {tag}
        </span>
      </div>

      {/* Quote with highlighted text */}
      <p className="text-[14px] leading-[1.75] text-muted-foreground mb-5">
        <HighlightedQuote quote={quote} highlight={highlight} />
      </p>

      {/* Bottom: stars + role */}
      <div className="flex items-center justify-between pt-5 border-t border-border">
        <Stars />
        <p className="text-[11px] text-muted-foreground truncate">
          {role} · {type}
        </p>
      </div>
    </MagicCard>
  )
}

/* ── Main Section ── */

export function Testimonials() {
  const dict = useDictionary()
  const home = dict.home || {}

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <BlurFade delay={0.1} inView>
          <div className="text-center mb-20">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[3px] mb-4">
              {home.theNetworkEffect || "Wall of love"}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.15]">
              {home.testimonialsTitle || (
                <>
                  Trusted by the architects of{" "}
                  <br />
                  <AnimatedGradientText speed={1.5} colorFrom="#14b8a6" colorTo="#f97316" className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                    social change.
                  </AnimatedGradientText>
                </>
              )}
            </h2>
          </div>
        </BlurFade>

        {/* Featured testimonial — hero quote card */}
        <BlurFade delay={0.2} inView>
          <div className="relative mx-auto max-w-3xl mb-20">
            <div className="relative rounded-3xl border border-border bg-card p-10 sm:p-14 shadow-sm">
              {/* Stars */}
              <Stars size="lg" />

              {/* Decorative quote mark */}
              <svg
                className="absolute top-8 right-10 size-16 text-muted"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>

              {/* Quote text with highlight */}
              <p className="relative z-10 mt-6 text-[22px] sm:text-[26px] lg:text-[30px] font-semibold text-foreground leading-[1.4] tracking-tight">
                <HighlightedQuote
                  quote={featuredTestimonial.quote}
                  highlight={featuredTestimonial.highlight}
                />
              </p>

              {/* Author row */}
              <div className="mt-8 flex items-center gap-4">
                <Avatar
                  name={featuredTestimonial.author}
                  image={featuredTestimonial.avatar}
                  size="lg"
                />
                <div>
                  <p className="text-[15px] font-semibold text-foreground">
                    {featuredTestimonial.author}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {featuredTestimonial.role} · {featuredTestimonial.organization}
                  </p>
                </div>
                <span className="ml-auto hidden sm:inline-block text-[10px] font-bold uppercase tracking-[2px] text-primary border border-border rounded-full px-4 py-1.5 bg-card">
                  {featuredTestimonial.tag}
                </span>
              </div>
            </div>
          </div>
        </BlurFade>
      </div>

      {/* ── Marquee rows (Magic UI) — full viewport width ── */}
      <div className="space-y-5">
        <Marquee pauseOnHover className="[--duration:45s] [--gap:1.25rem]">
          {testimonialRow1.map((t) => (
            <TestimonialCard key={t.id} {...t} />
          ))}
        </Marquee>

        <Marquee pauseOnHover reverse className="[--duration:50s] [--gap:1.25rem]">
          {testimonialRow2.map((t) => (
            <TestimonialCard key={t.id} {...t} />
          ))}
        </Marquee>
      </div>
    </section>
  )
}