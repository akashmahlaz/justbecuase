import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { impactMetrics } from "@/lib/data"
import { Users, Clock, DollarSign, FileText, MessageSquare, Shield, ArrowRight, Star, Briefcase, Database, Target, Search, Gift } from "lucide-react"

const benefits = [
  {
    icon: Briefcase,
    title: "Custom Job Postings",
    description:
      "Post remote roles for specialized job roles and functions and reach a global pool of talented candidates who prioritize social impact as much as professional growth.",
  },
  {
    icon: Database,
    title: "Pro Bono & Low Bono Database",
    description: "Access our vetted directory of Skilled Volunteers. Filter by skills and availability to find experts offering services at zero cost (Pro Bono) or significantly reduced rates (Low Bono).",
  },
  {
    icon: Target,
    title: "Skill-Matched Projects",
    description: "Don't need a full-time hire? Post a specific project with your requirements and let our matching engine find the perfect specialist for the task.",
  },
  {
    icon: Shield,
    title: "Vetted Volunteers",
    description: "All volunteers are verified professionals with proven track records and ratings from other NGOs.",
  },
  {
    icon: FileText,
    title: "Project Templates",
    description: "Use our pre-built templates to quickly post common project types and attract the right volunteers.",
  },
  {
    icon: MessageSquare,
    title: "Built-in Communication",
    description: "Communicate directly with volunteers through our platform. No need for external tools.",
  },
]

const projectTypes = [
  { name: "Social Media Strategy", hours: "10-15 hrs", value: "$750-$1,125" },
  { name: "Website Design", hours: "25-40 hrs", value: "$1,875-$3,000" },
  { name: "Grant Writing", hours: "15-20 hrs", value: "$1,125-$1,500" },
  { name: "Brand Identity", hours: "20-30 hrs", value: "$1,500-$2,250" },
  { name: "Legal Review", hours: "5-10 hrs", value: "$375-$750" },
  { name: "Financial Planning", hours: "10-15 hrs", value: "$750-$1,125" },
]

const faqs = [
  {
    question: "How do I post a project?",
    answer:
      "After creating your NGO account, click 'Post New Project' from your dashboard. You can choose from our project templates or create a custom project. It takes about 5 minutes to post a project.",
  },
  {
    question: "How are volunteers matched to our projects?",
    answer:
      "Volunteers browse projects based on their skills and interests. They apply to projects that match their expertise, and you review their profiles and past work before accepting an application.",
  },
  {
    question: "What's the difference between Pro Bono and Low Bono?",
    answer:
      "Pro Bono means volunteers donate their services entirely for free. Low Bono means they offer services at significantly reduced rates (typically 50-80% below market rates). Both options help NGOs access professional talent within their budgets.",
  },
  {
    question: "How do we verify our organization?",
    answer:
      "During signup, you'll provide your organization's registration details. We verify all NGOs to ensure they are legitimate nonprofits. Verified organizations receive a badge on their profile.",
  },
  {
    question: "What if a volunteer doesn't complete the project?",
    answer:
      "We encourage clear communication and milestone-setting. If issues arise, you can reopen the project to find a new volunteer. Our support team is also available to help mediate any challenges.",
  },
  {
    question: "Can we work with multiple volunteers?",
    answer:
      "Yes! You can post multiple projects simultaneously and work with different volunteers on each. Some larger projects can also be split into smaller pieces for multiple volunteers.",
  },
]

export default function ForNGOsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-gradient-to-b from-secondary/10 to-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                  For NGOs: Build Your Dream Team
                </h1>
                <p className="text-xl text-muted-foreground mb-4">
                  Get Professionals with specialized skill sets to support your NGO goals – available Pro Bono / Low Bono.
                </p>
                <p className="text-lg text-muted-foreground mb-8">
                  Access skilled professionals ready to help with marketing, tech, design, finance, and more. Post a
                  project in 5 minutes and start receiving applications from our global pool of purpose-driven talent.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <Link href="/auth/signup">
                      NGO's – Register Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-transparent">
                    <Link href="/projects">See Example Projects</Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <img
                  src="/nonprofit-team-meeting-diverse-professionals.png"
                  alt="NGO team collaborating"
                  className="rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -right-6 bg-card p-4 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Star className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">$2.4M+ Value</p>
                      <p className="text-sm text-muted-foreground">Created for NGOs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features for NGOs */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">How We Help NGOs Build Their Dream Team</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Access the talent you need through multiple pathways
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="border-2 hover:border-secondary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                    <Briefcase className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Custom Job Postings</h3>
                  <p className="text-sm text-muted-foreground">
                    Post remote roles for specialized job functions and reach a global pool of talented candidates who prioritize social impact as much as professional growth.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-secondary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                    <Database className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Pro Bono & Low Bono Database</h3>
                  <p className="text-sm text-muted-foreground">
                    Access our vetted directory of Skilled Volunteers. Filter by skills and availability to find experts offering services at zero cost (Pro Bono) or significantly reduced rates (Low Bono).
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-secondary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Skill-Matched Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Don't need a full-time hire? Post a specific project with your requirements and let our matching engine find the perfect specialist for the task.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold text-primary mb-2">{impactMetrics.ngosSupported}</p>
                <p className="text-muted-foreground">NGOs Supported</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-secondary mb-2">{impactMetrics.projectsCompleted}</p>
                <p className="text-muted-foreground">Projects Completed</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-primary mb-2">{impactMetrics.volunteers.toLocaleString()}</p>
                <p className="text-muted-foreground">Skilled Volunteers</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-secondary mb-2">
                  ${(impactMetrics.valueGenerated / 1000000).toFixed(1)}M
                </p>
                <p className="text-muted-foreground">Value Created</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Why NGOs Choose Us</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Get the professional support you need to grow your impact without stretching your budget
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit) => (
                <Card key={benefit.title}>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                      <benefit.icon className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Project Value Calculator */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">See the Value You Could Receive</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Based on average consultant rates of $75/hour, here's what you could save on common projects
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {projectTypes.map((project) => (
                <Card key={project.name}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-2">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {project.hours}
                    </p>
                    <p className="text-lg font-bold text-primary">{project.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Find Your Volunteers?</h2>
            <p className="text-xl mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
              Join hundreds of NGOs across Asia already benefiting from skills-based volunteering
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/signup">
                Get Started - It's Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
