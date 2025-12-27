import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/home/hero-section"
import  { ConnectivityNetwork }  from "@/components/home/impact-metrics"
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
        <ConnectivityNetwork />
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
