import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { impactMetrics } from "@/lib/data"
import { getActiveTeamMembers } from "@/lib/actions"
import { Heart, Target, Users, Globe, Award, ArrowRight, Linkedin, Twitter, Clock, Sparkles, Code, Palette, BarChart3, BookOpen } from "lucide-react"

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

const skills = [
  { icon: Code, name: "Developer" },
  { icon: Palette, name: "Designer" },
  { icon: BarChart3, name: "Strategist" },
  { icon: BookOpen, name: "Storyteller" },
]

export default async function AboutPage() {
  // Fetch team members from database
  const teamResult = await getActiveTeamMembers()
  const teamMembers = teamResult.success && teamResult.data ? teamResult.data : []

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Time is the New Currency</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">ABOUT US</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              In a world driven by transactions, we believe the most valuable asset you own isn't in your bank account—<span className="font-semibold text-foreground">it's in your schedule</span>.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              At JustBecause Network, we bridge the gap between passionate professionals and high-impact NGOs. We believe that a single hour of your expertise can be the catalyst for global change.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {skills.map((skill) => (
                <div key={skill.name} className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
                  <skill.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{skill.name}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Whether you are a developer, a designer, a strategist, or a storyteller, your skills are the "capital" needed to build a more sustainable and equitable planet.
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
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-4">Our Mission</h2>
              </div>
              <Card className="border-2 border-primary/20">
                <CardContent className="p-8 md:p-12">
                  <div className="flex items-start gap-4">
                    <div className="hidden md:block">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg md:text-xl text-foreground italic leading-relaxed">
                        "We believe that no professional skill should be confined to a cubicle when it could be changing a life. Our mission is to awaken the heartbeat within every career, creating a purpose-driven exchange that bridges the gap between world-class talent and the world's most urgent needs. We don't just match jobs; we align human potential with global hope—just because your talent was meant for more."
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Impact Stats */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
        </section>

        {/* Values */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These core principles guide everything we do at JustBecause Network
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
            {teamMembers.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {teamMembers.map((member) => (
                  <div key={member._id?.toString()} className="text-center">
                    <img
                      src={member.avatar || "/placeholder.svg"}
                      alt={member.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto mb-4 bg-muted"
                    />
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm text-primary mb-2">{member.role}</p>
                    <p className="text-sm text-muted-foreground mb-3">{member.bio}</p>
                    <div className="flex justify-center gap-2">
                      {member.linkedinUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {member.twitterUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={member.twitterUrl} target="_blank" rel="noopener noreferrer">
                            <Twitter className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Our team is growing! Check back soon.</p>
              </div>
            )}
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
