import LocaleLink from "@/components/locale-link"
import type { JBCertaResult, JBCertaResultType } from "@/lib/ai/jbcerta-ui"
import { cn } from "@/lib/utils"
import { ArrowRight, Briefcase, Building2, MapPin, ShieldCheck, Star, Users } from "lucide-react"

const TYPE_CONFIG: Record<
  JBCertaResultType,
  {
    icon: typeof Users
    label: string
    badgeClass: string
    bgGradient: string
    borderColor: string
    hoverBorder: string
    coverColor: string
  }
> = {
  volunteer: {
    icon: Users,
    label: "Impact Agent",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    bgGradient: "from-blue-50/80 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20",
    borderColor: "border-blue-200/60 dark:border-blue-800/40",
    hoverBorder: "hover:border-blue-400/70",
    coverColor: "bg-linear-to-br from-blue-500 to-indigo-600",
  },
  ngo: {
    icon: Building2,
    label: "NGO",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    bgGradient: "from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20",
    borderColor: "border-emerald-200/60 dark:border-emerald-800/40",
    hoverBorder: "hover:border-emerald-400/70",
    coverColor: "bg-linear-to-br from-emerald-500 to-teal-600",
  },
  opportunity: {
    icon: Briefcase,
    label: "Opportunity",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    bgGradient: "from-rose-50/80 to-amber-50/40 dark:from-rose-950/30 dark:to-amber-950/20",
    borderColor: "border-rose-200/60 dark:border-rose-800/40",
    hoverBorder: "hover:border-rose-400/70",
    coverColor: "bg-linear-to-br from-rose-500 to-amber-500",
  },
}

function resultHref(result: JBCertaResult) {
  if (result.type === "volunteer") return `/volunteers/${result.id}`
  if (result.type === "ngo") return `/ngos/${result.id}`
  return `/projects/${result.id}`
}

function initialsFor(title: string) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

export function ResultCard({ result }: { result: JBCertaResult }) {
  const config = TYPE_CONFIG[result.type]
  const Icon = config.icon
  const skills = (result.skills || []).slice(0, 4)
  const remainingSkills = Math.max(0, (result.skills?.length || 0) - skills.length)

  return (
    <LocaleLink
      href={resultHref(result)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-linear-to-br transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5",
        config.borderColor,
        config.hoverBorder
      )}
    >
      <div className={cn("h-1 w-full", config.coverColor)} />
      <div className={cn("flex items-start gap-3 p-4 bg-linear-to-br", config.bgGradient)}>
        <div className="shrink-0">
          {result.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.avatar}
              alt={result.title}
              className="h-12 w-12 rounded-xl object-cover shadow-sm ring-2 ring-white/60"
              loading="lazy"
            />
          ) : (
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm", config.coverColor)}>
              {initialsFor(result.title) || <Icon className="h-5 w-5" />}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                  {result.title}
                </span>
                {result.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" strokeWidth={0} />}
              </div>
              {result.subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{result.subtitle}</p>}
              {result.location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/70">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{result.location}</span>
                </p>
              )}
            </div>
            <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold", config.badgeClass)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </span>
          </div>

          {skills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {skills.map((skill) => (
                <span key={skill} className="rounded-md border border-border/50 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {skill}
                </span>
              ))}
              {remainingSkills > 0 && <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground/60">+{remainingSkills}</span>}
            </div>
          )}

          {(typeof result.rating === "number" || result.workMode || result.volunteerType) && (
            <div className="mt-2.5 flex items-center gap-3">
              {typeof result.rating === "number" && (
                <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {result.rating.toFixed(1)}
                </span>
              )}
              {result.workMode && <span className="text-[10px] capitalize text-muted-foreground/60">{result.workMode}</span>}
              {result.volunteerType && <span className="text-[10px] font-medium text-muted-foreground/70">{result.volunteerType}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/30 bg-muted/30 px-4 py-2">
        <span className="text-[10px] text-muted-foreground/50">View full profile</span>
        <ArrowRight className="h-3 w-3 text-primary/60 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </LocaleLink>
  )
}
