"use client";

import { UserPlus, Search, Rocket, FileText, Users, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import LocaleLink from "@/components/locale-link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
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
      title: home.volStep2Title || "Discover Opportunities",
      description: home.volStep2Desc || "Browse meaningful opportunities matched to your expertise. Filter by skills, time, and location.",
    },
    {
      icon: Rocket,
      title: home.volStep3Title || "Make an Impact",
      description: home.volStep3Desc || "Complete opportunities, build your portfolio, and create lasting change for communities.",
    },
  ];

  const ngoSteps = [
    {
      icon: FileText,
      title: home.ngoStep1Title || "Post Your Opportunity",
      description: home.ngoStep1Desc || "Describe your needs in just 5 minutes using our pre-scoped templates.",
    },
    {
      icon: Users,
      title: home.ngoStep2Title || "Review Applications",
      description: home.ngoStep2Desc || "Browse impact agent profiles, check ratings, and find the perfect match for your opportunity.",
    },
    {
      icon: CheckCircle,
      title: home.ngoStep3Title || "Get Expert Help",
      description: home.ngoStep3Desc || "Collaborate with skilled impact agents and receive professional-quality deliverables.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative py-24 overflow-hidden bg-background">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <Tabs defaultValue="ngos" className="max-w-5xl mx-auto">
          <div className="flex justify-center mb-16">
            <TabsList className="inline-flex h-14 items-center justify-center rounded-full bg-muted p-1.5 shadow-inner border border-border/50">
              <TabsTrigger 
                value="volunteers" 
                className="px-8 py-2.5 rounded-full text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md"
              >
                {home.forImpactAgentsTab || "For Impact Agents"}
              </TabsTrigger>
              <TabsTrigger 
                value="ngos" 
                className="px-8 py-2.5 rounded-full text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-secondary data-[state=active]:shadow-md"
              >
                {home.forNGOsTab || "For NGOs"}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="volunteers" className="outline-none">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-12 relative"
            >
              {volunteerSteps.map((step, index) => (
                <motion.div key={step.title} variants={itemVariants} className="group relative">
                  {index < volunteerSteps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-1/2 w-full h-[2px] bg-gradient-to-r from-primary/30 via-primary/5 to-transparent z-0" />
                  )}

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative group-hover:scale-110 transition-transform duration-500">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-card border border-border shadow-sm group-hover:border-primary/50 group-hover:shadow-primary/10 transition-all mb-8">
                        <step.icon className="h-10 w-10 text-primary" />
                        <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                          {index + 1}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-center px-4">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-16 text-center"
            >
              <Button asChild size="lg" className="h-12 px-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 rounded-full transition-all hover:scale-105 active:scale-95">
                <LocaleLink href="/for-volunteers">{home.joinAsImpactAgent || "Join as an Impact Agent"}</LocaleLink>
              </Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="ngos" className="outline-none">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-12 relative"
            >
              {ngoSteps.map((step, index) => (
                <motion.div key={step.title} variants={itemVariants} className="group relative">
                  {index < ngoSteps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-1/2 w-full h-[2px] bg-gradient-to-r from-secondary/30 via-secondary/5 to-transparent z-0" />
                  )}

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative group-hover:scale-110 transition-transform duration-500">
                      <div className="absolute inset-0 bg-secondary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-card border border-border shadow-sm group-hover:border-secondary/50 group-hover:shadow-secondary/10 transition-all mb-8">
                        <step.icon className="h-10 w-10 text-secondary" />
                        <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                          {index + 1}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-center px-4">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-16 text-center"
            >
              <Button asChild size="lg" className="h-12 px-10 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-xl shadow-secondary/20 rounded-full transition-all hover:scale-105 active:scale-95">
                <LocaleLink href="/for-ngos">{home.registerOrganization || "Register Organization"}</LocaleLink>
              </Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}