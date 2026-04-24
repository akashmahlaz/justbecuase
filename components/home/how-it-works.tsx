"use client";

import { UserPlus, Search, Rocket, FileText, Users, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LocaleLink from "@/components/locale-link";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/components/dictionary-provider";

export function HowItWorks() {
  const dict = useDictionary();
  const home = dict.home || {};

  const volunteerSteps = [
    {
      icon: UserPlus,
      title: home.volStep1Title || "Create Your Profile",
      description: home.volStep1Desc || "Sign up and showcase your skills, experience, and the causes you care about.",
    },
    {
      icon: Search,
      title: home.volStep2Title || "Discover Jobs",
      description: home.volStep2Desc || "Browse meaningful jobs matched to your expertise. Filter by skills, time, and location.",
    },
    {
      icon: Rocket,
      title: home.volStep3Title || "Make an Impact",
      description: home.volStep3Desc || "Complete jobs, build your portfolio, and create lasting change for communities.",
    },
  ];

  const ngoSteps = [
    {
      icon: FileText,
      title: home.ngoStep1Title || "Post Your Job",
      description: home.ngoStep1Desc || "Describe your needs in just 5 minutes using our pre-scoped templates.",
    },
    {
      icon: Users,
      title: home.ngoStep2Title || "Review Applications",
      description: home.ngoStep2Desc || "Browse candidate profiles, check ratings, and find the perfect match for your job.",
    },
    {
      icon: CheckCircle,
      title: home.ngoStep3Title || "Get Expert Help",
      description: home.ngoStep3Desc || "Collaborate with skilled candidates and receive professional-quality deliverables.",
    },
  ];

  function StepCards({ steps, color }: { steps: typeof volunteerSteps; color: "primary" | "secondary" }) {
    return (
      <div className="grid md:grid-cols-3 gap-8 relative">
        {steps.map((step, index) => (
          <div key={step.title} className="relative flex flex-col items-center text-center">
            {index < steps.length - 1 && (
              <div className={`hidden md:block absolute top-12 left-[calc(50%+48px)] w-[calc(100%-96px)] h-px bg-border z-0`} />
            )}
            <div className={`relative flex items-center justify-center w-20 h-20 rounded-2xl bg-${color}/5 border border-${color}/20 mb-6`}>
              <step.icon className={`h-8 w-8 text-${color}`} />
              <span className={`absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-${color} text-${color}-foreground text-xs font-bold flex items-center justify-center`}>
                {index + 1}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="pt-8 pb-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <Tabs defaultValue="ngos" className="max-w-5xl mx-auto">
          <div className="flex justify-center mb-14">
            <TabsList className="inline-flex h-12 items-center justify-center rounded-full bg-muted p-1 border border-border/50">
              <TabsTrigger 
                value="volunteers" 
                className="px-6 py-2 rounded-full text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                {home.forImpactAgentsTab || "For Candidates"}
              </TabsTrigger>
              <TabsTrigger 
                value="ngos" 
                className="px-6 py-2 rounded-full text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-secondary data-[state=active]:shadow-sm"
              >
                {home.forNGOsTab || "For NGOs"}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="volunteers" className="outline-none">
            <StepCards steps={volunteerSteps} color="primary" />
            <div className="mt-14 text-center">
              <Button asChild size="lg" className="h-12 px-10 rounded-full">
                <LocaleLink href="/for-volunteers">{home.joinAsImpactAgent || "Join as an Candidate"}</LocaleLink>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ngos" className="outline-none">
            <StepCards steps={ngoSteps} color="secondary" />
            <div className="mt-14 text-center">
              <Button asChild size="lg" className="h-12 px-10 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full">
                <LocaleLink href="/for-ngos">{home.registerOrganization || "Register Organization"}</LocaleLink>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}