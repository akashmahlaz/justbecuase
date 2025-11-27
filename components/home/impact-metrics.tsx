"use client"

import { useEffect, useState, useRef } from "react"
import { Users, CheckCircle2, Building2, Clock, DollarSign } from "lucide-react"
import { impactMetrics } from "@/lib/data"

function AnimatedCounter({
  end,
  duration = 2000,
  prefix = "",
  suffix = "",
}: {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
}) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      setCount(Math.floor(progress * end))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrame)
  }, [isVisible, end, duration])

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return num.toLocaleString()
    }
    return num.toString()
  }

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-bold text-foreground">
      {prefix}
      {formatNumber(count)}
      {suffix}
    </div>
  )
}

export function ImpactMetrics() {
  const metrics = [
    {
      icon: Users,
      value: impactMetrics.volunteers,
      label: "Skilled Volunteers",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: CheckCircle2,
      value: impactMetrics.projectsCompleted,
      label: "Projects Completed",
      color: "text-success",
      bgColor: "bg-success-light",
    },
    {
      icon: Building2,
      value: impactMetrics.ngosSupported,
      label: "NGOs Supported",
      color: "text-secondary",
      bgColor: "bg-coral-light",
    },
    {
      icon: Clock,
      value: impactMetrics.hoursContributed,
      label: "Hours Contributed",
      color: "text-primary",
      bgColor: "bg-primary/10",
      suffix: "+",
    },
    {
      icon: DollarSign,
      value: impactMetrics.valueGenerated,
      label: "Value Generated (USD)",
      color: "text-success",
      bgColor: "bg-success-light",
      prefix: "$",
    },
  ]

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Our Collective Impact</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Together, our community of skilled volunteers and NGOs are creating measurable change across Asia.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="text-center p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${metric.bgColor} mb-4`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <AnimatedCounter end={metric.value} prefix={metric.prefix || ""} suffix={metric.suffix || ""} />
              <p className="text-sm text-muted-foreground mt-2">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
