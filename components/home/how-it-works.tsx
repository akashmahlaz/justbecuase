import { UserPlus, Search, Rocket, FileText, Users, CheckCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you're a skilled professional or an NGO seeking support, getting started is simple.
          </p>
        </div>

        <Tabs defaultValue="volunteers" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-12">
            <TabsTrigger value="volunteers" className="text-base py-3">
              For Volunteers
            </TabsTrigger>
            <TabsTrigger value="ngos" className="text-base py-3">
              For NGOs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="volunteers">
            <div className="grid md:grid-cols-3 gap-8">
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
          </TabsContent>

          <TabsContent value="ngos">
            <div className="grid md:grid-cols-3 gap-8">
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
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
