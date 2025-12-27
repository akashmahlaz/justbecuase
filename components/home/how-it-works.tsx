"use client";

import { UserPlus, Search, Rocket, FileText, Users, CheckCircle, Gift, DollarSign, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
  ];

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
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1.5 mb-4 text-xs font-bold tracking-widest uppercase rounded-full bg-primary/10 text-primary">
              The Ecosystem
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6 text-balance">
              The Global Purpose-Driven Exchange
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Where <span className="text-foreground font-semibold">"Time"</span> is the premium currency. 
              Bridging the gap between world-class talent and social impact.
            </p>
          </motion.div>
        </div>

        <Tabs defaultValue="volunteers" className="max-w-5xl mx-auto">
          <div className="flex justify-center mb-16">
            <TabsList className="inline-flex h-14 items-center justify-center rounded-full bg-muted p-1.5 shadow-inner border border-border/50">
              <TabsTrigger 
                value="volunteers" 
                className="px-8 py-2.5 rounded-full text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md"
              >
                For Volunteers
              </TabsTrigger>
              <TabsTrigger 
                value="ngos" 
                className="px-8 py-2.5 rounded-full text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-secondary data-[state=active]:shadow-md"
              >
                For NGOs
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
                  {/* Elegant Connector Line */}
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
                <Link href="/for-volunteers">Join as a Volunteer</Link>
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
                  {/* Elegant Connector Line */}
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
                <Link href="/for-ngos">Register Organization</Link>
              </Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}