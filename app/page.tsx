import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/home/hero-section"
import  { ImpactMetrics }  from "@/components/home/impact-metrics"
import { HowItWorks } from "@/components/home/how-it-works"
import { FeaturedProjects } from "@/components/home/featured-projects"
import { SkillCategories } from "@/components/home/skill-categories"
import { Testimonials } from "@/components/home/testimonials"
import { CTASection } from "@/components/home/cta-section"


export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
                  <ImpactMetrics impactMetrics={{ volunteers: 5000, projectsCompleted: 120, ngosSupported: 75, hoursContributed: 10000, valueGenerated: 250000 }} />
        <HowItWorks />
        <FeaturedProjects />
        <SkillCategories />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
