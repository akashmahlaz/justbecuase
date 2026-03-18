import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/home/hero-section"
import { GlobalSearchSection } from "@/components/home/global-search-section"
import { HowItWorks } from "@/components/home/how-it-works"
import { FeaturedProjects } from "@/components/home/featured-projects"
import { FeaturedCandidates } from "@/components/home/featured-candidates"
import { Testimonials } from "@/components/home/testimonials"
import { CTASection } from "@/components/home/cta-section"
import { ScrollProgress } from "@/components/ui/scroll-progress"

// Render at request time (needs MongoDB connection)
export const dynamic = "force-dynamic"


export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollProgress />
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <HowItWorks />
        <FeaturedProjects />
        <FeaturedCandidates />
        <GlobalSearchSection />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
