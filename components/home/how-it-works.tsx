import { UserPlus, Search, Rocket, FileText, Users, CheckCircle, Clock, Gift, DollarSign, Briefcase, Target, Database, Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HowItWorks() {
  const volunteerSteps = [
    {
      icon: UserPlus,
      title: "Create Your Profile",
      description: "Sign up and showcase your skills, experience, and the causes you care about.",
    },
    {
      icon: Search,
      title: "Discover Projects",
      description: "Browse meaningful projects matched to your expertise. Filter by skills, time, and location.",
    },
    {
      icon: Rocket,
      title: "Make an Impact",
      description: "Complete projects, build your portfolio, and create lasting change for communities.",
    },
  ]

  const ngoSteps = [
    {
      icon: FileText,
      title: "Post Your Project",
      description: "Describe your needs in just 5 minutes using our pre-scoped templates.",
    },
    {
      icon: Users,
      title: "Review Applications",
      description: "Browse volunteer profiles, check ratings, and find the perfect match for your project.",
    },
    {
      icon: CheckCircle,
      title: "Get Expert Help",
      description: "Collaborate with skilled volunteers and receive professional-quality deliverables.",
    },
  ]

  const exchangeTypes = [
    {
      icon: Gift,
      title: "Pro Bono (Free)",
      description: "Donate your expertise entirely. This is pure-contribution volunteering for those who want to use their \"time currency\" to power a cause they love.",
      color: "primary",
    },
    {
      icon: DollarSign,
      title: "Low Bono (Discounted)",
      description: "Offer your services at a significantly reduced rate. This allows NGOs to access high-tier professional work within their budgets while helping professionals sustain their own livelihoods.",
      color: "secondary",
    },
    {
      icon: Sparkles,
      title: "Pro Bono + Low Bono",
      description: "The option to do both? Yes. Flexibility to contribute your way.",
      color: "success",
    },
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        {/* Main Header */}
        {/* <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">The Global Purpose-Driven Exchange</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-2">
            Your <span className="font-semibold text-primary">"Time"</span> is the new currency.
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you're a skilled professional or an NGO seeking support, getting started is simple.
          </p>
        </div> */}

        {/* Exchange Types */}
        {/* <div className="grid md:grid-cols-3 gap-6 mb-16">
          {exchangeTypes.map((type) => (
            <Card key={type.title} className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className={`w-12 h-12 rounded-xl bg-${type.color}/10 flex items-center justify-center mb-4`}>
                  <type.icon className={`h-6 w-6 text-${type.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{type.title}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div> */}

        <Tabs defaultValue="volunteers" className="max-w-4xl p-4 rounded-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2  mb-12">
            <TabsTrigger value="volunteers" className="text-base py-3">
              <h1 className="text-primary">For Volunteers</h1>
            </TabsTrigger>
            <TabsTrigger value="ngos" className="text-base py-3">
              For NGOs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="volunteers">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {volunteerSteps.map((step, index) => (
                <div key={step.title} className="relative text-center">
                  {/* Step number connector */}
                  {index < volunteerSteps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-border" />
                  )}

                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
                    <step.icon className="h-8 w-8 text-primary" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link href="/for-volunteers">
                  Volunteers – Register Now
                </Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ngos">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {ngoSteps.map((step, index) => (
                <div key={step.title} className="relative text-center">
                  {index < ngoSteps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-border" />
                  )}

                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary/10 mb-6">
                    <step.icon className="h-8 w-8 text-secondary" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Link href="/for-ngos">
                  NGO's – Register Now
                </Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
