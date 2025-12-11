import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/project-card"
import { browseProjects } from "@/lib/actions"
import { ArrowRight } from "lucide-react"

export async function FeaturedProjects() {
  const projects = await browseProjects()
  const featuredProjects = projects.slice(0, 6)

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Featured Projects</h2>
            <p className="text-muted-foreground max-w-2xl">
              Explore current opportunities from verified NGOs across Asia looking for skilled volunteers like you.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-4 md:mt-0 bg-transparent">
            <Link href="/projects" className="flex items-center gap-2">
              Browse All Projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {featuredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No projects available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProjects.map((project) => (
              <ProjectCard key={project._id?.toString()} project={{
                id: project._id?.toString() || "",
                title: project.title,
                description: project.description,
                skills: project.skillsRequired?.map((s: any) => s.subskillId) || [],
                location: project.workMode === "remote" ? "Remote" : project.location || "On-site",
                timeCommitment: project.timeCommitment,
                applicants: project.applicantsCount || 0,
                postedAt: project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Recently",
                projectType: project.projectType,
                ngo: { name: "NGO", verified: true }
              }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
