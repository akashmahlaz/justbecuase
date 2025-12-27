import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { testimonials } from "@/lib/data"
import { Briefcase, Award, TrendingUp, Heart, Clock, Globe, ArrowRight, CheckCircle, Gift, DollarSign, Sparkles } from "lucide-react"

const benefits = [
  {
    icon: Briefcase,
    title: "Build Your Portfolio",
    description: "Add real-world projects to your resume and showcase your impact to future employers.",
  },
  {
    icon: TrendingUp,
    title: "Develop New Skills",
    description: "Take on challenging projects that push your boundaries and help you grow professionally.",
  },
  {
    icon: Heart,
    title: "Make a Difference",
    description: "Use your expertise to create lasting positive change in communities across Asia.",
  },
  {
    icon: Globe,
    title: "Flexible Volunteering",
    description: "Choose from virtual opportunities or local projects that fit your schedule and lifestyle.",
  },
  {
    icon: Award,
    title: "Get Recognized",
    description: "Earn badges, testimonials, and track your impact with our comprehensive volunteer profiles.",
  },
  {
    icon: Clock,
    title: "Choose Your Commitment",
    description: "From 1-hour consultations to long-term projects, find opportunities that match your availability.",
  },
]

const exchangeOptions = [
  {
    icon: Gift,
    title: "Pro Bono (Free)",
    description: "Donate your expertise entirely. This is pure-contribution volunteering for those who want to use their \"time currency\" to power a cause they love.",
  },
  {
    icon: DollarSign,
    title: "Low Bono (Discounted)",
    description: "Offer your services at a significantly reduced rate. This allows NGOs to access high-tier professional work within their budgets while helping you sustain your livelihood.",
  },
  {
    icon: Sparkles,
    title: "Pro Bono + Low Bono",
    description: "The option to do both? Yes. Combine pure volunteering with discounted work based on your preference and the NGO's needs.",
  },
]

const steps = [
  {
    number: "01",
    title: "Create Your Profile",
    description: "Sign up and showcase your skills, experience, and the causes you care about.",
  },
  {
    number: "02",
    title: "Browse Projects",
    description: "Explore opportunities matched to your skills and interests from vetted NGOs.",
  },
  {
    number: "03",
    title: "Apply & Connect",
    description: "Submit your application and connect directly with the organization.",
  },
  {
    number: "04",
    title: "Make an Impact",
    description: "Complete the project, receive feedback, and add it to your portfolio.",
  },
]

const faqs = [
  {
    question: "How much time do I need to commit?",
    answer:
      "We have opportunities for every schedule! From 1-hour consultation calls to multi-week projects. You can filter opportunities by time commitment and choose what works best for you.",
  },
  {
    question: "Do I need professional experience?",
    answer:
      "While we welcome professionals with all levels of experience, most projects require some level of expertise in your chosen skill area. Students and early-career professionals can find mentorship opportunities and shorter projects.",
  },
  {
    question: "Are the projects remote or in-person?",
    answer:
      "Most projects are remote/virtual, allowing you to volunteer from anywhere. Some NGOs offer in-person opportunities for volunteers in specific locations. You can filter by location when browsing projects.",
  },
  {
    question: "How are NGOs vetted?",
    answer:
      "We verify all organizations on our platform to ensure they are legitimate nonprofits. We review their registration documents, mission, and track record before approving them.",
  },
  {
    question: "What's the difference between Pro Bono and Low Bono?",
    answer:
      "Pro Bono means donating your services entirely for free. Low Bono means offering your services at a significantly reduced rate (typically 50-80% below market rates). You can choose either option or both based on your preference.",
  },
  {
    question: "How do I track my impact?",
    answer:
      "Your volunteer dashboard shows your hours contributed, projects completed, skills used, and estimated value of your contributions. You can also collect testimonials from NGOs you've worked with.",
  },
]

export default function ForVolunteersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-primary/10 to-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Your Skills Have the Power to Change a Life</h1>
                <p className="text-xl text-muted-foreground mb-4">
                  At the JustBecause Network, we believe your professional expertise is more than just a paycheck—it's a pathway to impact.
                </p>
                <p className="text-lg text-muted-foreground mb-6">
                  Join our Purpose-Driven Exchange and lend your talent to NGOs who are changing the world. Not because you have to, but <span className="font-semibold text-primary">JustBecause you can</span>.
                </p>
                <p className="text-muted-foreground mb-8">
                  Our platform serves as a high-impact marketplace connecting skilled and semi-skilled professionals with NGOs and grassroots causes in the development sector that are actively healing our planet.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                    <Link href="/auth/signup">
                      Volunteers – Register Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-transparent">
                    <Link href="/projects">Browse Projects</Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <img
                  src="/diverse-professionals-volunteering-laptop-teamwork.png"
                  alt="Volunteers collaborating"
                  className="rounded-2xl shadow-2xl" />
                <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">2,847 Volunteers</p>
                      <p className="text-sm text-muted-foreground">Making an impact</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Global Purpose-Driven Exchange */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">The Global Purpose-Driven Exchange</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Volunteers (Professionals): Your <span className="font-semibold text-primary">"Time"</span> is the new currency.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {exchangeOptions.map((option) => (
                <Card key={option.title} className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <option.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{option.title}</h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Why Volunteer With Us?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Skills-based volunteering offers unique benefits that traditional volunteering can't match
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit) => (
                <Card key={benefit.title}>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Getting started is easy. Here's how you can begin making an impact today.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="text-6xl font-bold text-primary/10 mb-4">{step.number}</div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-8 -right-4 h-6 w-6 text-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Volunteer Stories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hear from volunteers who have made a difference through our platform
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials
              .filter((t) => t.type === "volunteer")
              .concat(testimonials.filter((t) => t.type === "ngo").slice(0, 2))
              .map((testimonial) => (
                <Card key={testimonial.id}>
                  <CardContent className="pt-6">
                    <p className="text-foreground mb-6 italic">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-3">
                      <img
                        src={testimonial.avatar || "/placeholder.svg"}
                        alt={testimonial.author}
                        className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about volunteering with us</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Making an Impact?</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join our community of skilled volunteers and start contributing to causes you care about today.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/auth/signup">
              Create Your Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  )
}
