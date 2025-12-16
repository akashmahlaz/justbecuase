import { Users, CheckCircle2, Building2, Clock, DollarSign } from "lucide-react"
import { getImpactMetrics } from "@/lib/actions"

export async function ImpactMetrics() {
  const impactMetrics = await getImpactMetrics()

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

  const formatNumber = (num: number, prefix = "", suffix = "") => {
    let formatted = ""
    if (num >= 1000000) {
      formatted = (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      formatted = num.toLocaleString()
    } else {
      formatted = num.toString()
    }
    return `${prefix}${formatted}${suffix}`
  }

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
              <div className="text-4xl md:text-5xl font-bold text-foreground">
                {formatNumber(metric.value, metric.prefix, metric.suffix)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
