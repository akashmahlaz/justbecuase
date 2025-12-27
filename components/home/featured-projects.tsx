import Link from "next/link"
import { ProjectCard } from "@/components/project-card"
import { browseProjects } from "@/lib/actions"
import { ArrowRight } from "lucide-react"

export async function FeaturedProjects() {
  const projects = await browseProjects()
  const featuredProjects = projects.slice(0, 6)

  return (
    <section className="relative py-24 bg-white overflow-hidden">
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
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-20 border-b border-slate-100 pb-8">
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-4 block">
              Selection . 01
            </span>
            <h2 className="text-4xl md:text-5xl font-medium text-slate-900 tracking-tighter mb-6">
              Featured Projects
            </h2>
            <p className="text-slate-500 leading-relaxed">
              A curated directory of high-impact opportunities from verified NGOs across Asia. 
              Designed for architects of social change.
            </p>
          </div>

          <div className="mt-8 md:mt-0">
            <Link 
              href="/projects" 
              className="group flex items-center gap-3 text-xs uppercase tracking-widest font-bold text-slate-900 transition-all"
            >
              Browse All Projects
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-3" />
            </Link>
          </div>
        </header>

        {/* Asymmetric Grid */}
        {featuredProjects.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-200">
            <p className="text-slate-400 uppercase tracking-widest text-xs">No entries found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-20 gap-x-12">
            {featuredProjects.map((project, index) => {
              // Stagger Logic: Even rows span 7, Odd rows span 5 (and vice-versa for balance)
              const isLarge = index % 2 === 0;
              const colSpan = isLarge ? "md:col-span-7" : "md:col-span-5";
              const marginTop = index > 1 ? "md:-mt-12" : ""; // Subtle vertical overlap

              return (
                <div key={project._id?.toString()} className={`${colSpan} ${marginTop} flex flex-col`}>
                  {/* Linear Spine & Index Marker */}
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="h-[1px] flex-grow bg-slate-100" />
                  </div>

                  {/* Project Card Wrapper */}
                  <div className="hover:opacity-90 transition-opacity">
                    <ProjectCard project={{
                      id: project._id?.toString() || "",
                      title: project.title,
                      description: project.description,
                      skills: project.skillsRequired?.map((s: any) => s.subskillId) || [],
                      location: project.workMode === "remote" ? "Remote" : project.location || "On-site",
                      timeCommitment: project.timeCommitment,
                      applicants: project.applicantsCount || 0,
                      postedAt: project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Recently",
                      projectType: project.projectType,
                      ngo: { name: (project as any).ngoName || "Verified Partner", verified: true }
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  )
}