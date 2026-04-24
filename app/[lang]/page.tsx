import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/home/hero-section"
import { GlobalSearchSection } from "@/components/home/global-search-section"
import { HowItWorks } from "@/components/home/how-it-works"
import { FeaturedProjects } from "@/components/home/featured-projects"
import { FeaturedCandidates } from "@/components/home/featured-candidates"
import { CTASection } from "@/components/home/cta-section"
import { ScrollProgress } from "@/components/ui/scroll-progress"
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/json-ld"
import { generatePageMetadata } from "@/lib/seo"

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  return generatePageMetadata({
    title: "JustBeCause Network - Connect Your Skills with Meaningful Causes",
    description:
      "Join thousands of skilled professionals making real-world impact. Browse volunteer jobs, connect with Enterprises, and use your expertise for social good. Free skills-based volunteering platform.",
    path: `/${lang}`,
    keywords: [
      "volunteer from home",
      "online volunteering",
      "remote volunteer jobs",
      "skilled volunteer matching",
      "Enterprise projects near me",
      "social impact careers",
      "give back with skills",
      "free volunteer platform",
    ],
  })
}

// Render at request time (needs MongoDB connection)
export const dynamic = "force-dynamic"


export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <ScrollProgress />
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <HowItWorks />
        <FeaturedProjects />
        <FeaturedCandidates />
        <GlobalSearchSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
