"use client"

import { useState, useEffect } from "react"
import LocaleLink from "@/components/locale-link"
import { ProjectCard } from "@/components/project-card"
import { browseProjects } from "@/lib/actions"
import { ArrowRight } from "lucide-react"
import { resolveSkillName } from "@/lib/skills-data"
import { useDictionary } from "@/components/dictionary-provider"
import { useLocale } from "@/hooks/use-locale"
import { Skeleton } from "@/components/ui/skeleton"

export function FeaturedProjects() {
  const dict = useDictionary()
  const locale = useLocale()
  const home = dict.home || {}
  const [featuredProjects, setFeaturedProjects] = useState<Awaited<ReturnType<typeof browseProjects>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    browseProjects()
      .then(projects => setFeaturedProjects(projects.slice(0, 6)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="relative py-24 bg-background overflow-hidden">
      {/* Editorial Dot Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(#f1f5f9 1px, transparent 1px)`, 
          backgroundSize: '32px 32px' 
        }} 
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-20 border-b border-border pb-8">
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-4 block">
              {home.featuredSelection || "Selection . 01"}
            </span>
            <h2 className="text-4xl md:text-5xl font-medium text-foreground tracking-tighter mb-6">
              {home.featuredProjects || "Featured Opportunities"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {home.featuredProjectsDesc || "A curated directory of high-impact opportunities from verified NGOs worldwide. Designed for architects of social change."}
            </p>
          </div>

          <div className="mt-8 md:mt-0">
            <LocaleLink 
              href="/projects" 
              className="group flex items-center gap-3 text-xs uppercase tracking-widest font-bold text-foreground transition-all"
            >
              {home.browseAllOpportunities || "Browse All Opportunities"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-3" />
            </LocaleLink>
          </div>
        </header>

        {/* Horizontal Scroll */}
        {loading ? (
          <div className="flex gap-6 overflow-hidden -mx-4 px-4 md:-mx-6 md:px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[320px] max-w-[380px] flex-shrink-0 rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : featuredProjects.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground uppercase tracking-widest text-xs">{home.noEntries || "No entries found"}</p>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
            {featuredProjects.map((project) => (
              <div key={project._id?.toString()} className="min-w-[320px] max-w-[380px] flex-shrink-0 snap-start">
                <ProjectCard project={{
                  id: project._id?.toString() || "",
                  title: project.title,
                  description: project.description,
                  skills: project.skillsRequired?.map((s: any) => resolveSkillName(s.subskillId)) || [],
                  location: project.workMode === "remote" ? (dict.search?.remote || "Remote") : project.location || (dict.search?.onsite || "On-site"),
                  timeCommitment: project.timeCommitment,
                  applicants: project.applicantsCount || 0,
                  postedAt: project.createdAt ? new Date(project.createdAt).toLocaleDateString(locale) : (dict.common?.recently || "Recently"),
                  projectType: project.projectType,
                  ngo: { name: (project as any).ngoName || (dict.common?.verifiedPartner || "Verified Partner"), verified: true }
                }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}