import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { impactMetrics } from "@/lib/data"
import { Heart, Target, Users, Globe, Award, ArrowRight, Linkedin, Twitter } from "lucide-react"

const teamMembers = [
  {
    name: "Michelle Tan",
    role: "Founder & CEO",
    bio: "Former nonprofit consultant with 15 years of experience connecting talent with purpose.",
    avatar: "/asian-woman-executive-portrait.png",
  },
  {
    name: "David Lee",
    role: "Head of Partnerships",
    bio: "Previously led volunteer programs at major NGOs across Southeast Asia.",
    avatar: "/asian-man-professional-portrait.png",
  },
  {
    name: "Priya Menon",
    role: "Head of Product",
    bio: "Tech leader passionate about building products that create social impact.",
    avatar: "/indian-woman-tech-professional.png",
  },
  {
    name: "James Wong",
    role: "Community Lead",
    bio: "Volunteer coordinator who has matched hundreds of professionals with meaningful projects.",
    avatar: "/asian-man-friendly-portrait.png",
  },
]

const values = [
  {
    icon: Heart,
    title: "Impact First",
    description: "Every decision we make is guided by the impact it will create for communities across Asia.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "We believe in the power of collective action and building strong volunteer communities.",
  },
  {
    icon: Target,
    title: "Excellence",
    description: "We strive to match the highest quality volunteers with NGOs for maximum effectiveness.",
  },
  {
    icon: Globe,
    title: "Accessibility",
    description: "Making skills-based volunteering accessible to everyone, regardless of location or background.",
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Connecting Skills with Purpose</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              JustBecause.asia is the leading skills-based volunteering platform in Asia, connecting talented
              professionals with NGOs and nonprofits to create lasting impact.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link href="/auth/signup">Join Our Community</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent">
                <Link href="/projects">Browse Projects</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-6">Our Mission</h2>
                <p className="text-lg text-muted-foreground mb-4">
                  We believe that everyone has skills that can make a difference. Our mission is to make it easy for
                  professionals to contribute their expertise to causes they care about, while helping NGOs access the
                  talent they need to grow their impact.
                </p>
                <p className="text-lg text-muted-foreground mb-6">
                  By bridging the gap between skilled volunteers and resource-constrained nonprofits, we're creating a
                  more connected, compassionate, and capable social sector across Asia.
                </p>
                <div className="flex items-center gap-2 text-primary">
                  <Heart className="h-5 w-5" fill="currentColor" />
                  <span className="font-semibold">Just because we can, we should.</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-primary/10 text-center">
                  <p className="text-4xl font-bold text-primary mb-2">{impactMetrics.volunteers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Active Volunteers</p>
                </div>
                <div className="p-6 rounded-2xl bg-secondary/10 text-center">
                  <p className="text-4xl font-bold text-secondary mb-2">{impactMetrics.projectsCompleted}</p>
                  <p className="text-sm text-muted-foreground">Projects Completed</p>
                </div>
                <div className="p-6 rounded-2xl bg-success-light text-center">
                  <p className="text-4xl font-bold text-success mb-2">{impactMetrics.ngosSupported}</p>
                  <p className="text-sm text-muted-foreground">NGOs Supported</p>
                </div>
                <div className="p-6 rounded-2xl bg-accent text-center">
                  <p className="text-4xl font-bold text-accent-foreground mb-2">
                    ${(impactMetrics.valueGenerated / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-muted-foreground">Value Created</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These core principles guide everything we do at JustBecause.asia
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value) => (
                <Card key={value.title} className="text-center">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Passionate individuals dedicated to connecting skills with purpose
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member) => (
                <div key={member.name} className="text-center">
                  <img
                    src={member.avatar || "/placeholder.svg"}
                    alt={member.name}
                    className="w-32 h-32 rounded-full object-cover mx-auto mb-4 bg-muted"
                  />
                  <h3 className="font-semibold text-foreground">{member.name}</h3>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground mb-3">{member.bio}</p>
                  <div className="flex justify-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Linkedin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Twitter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <Award className="h-12 w-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold mb-4">Ready to Make an Impact?</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
              Whether you're a skilled professional looking to give back or an NGO seeking expert help, we're here to
              connect you with opportunities that matter.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary">
                <Link href="/auth/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="/projects">Browse Projects</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
