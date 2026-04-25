"use client"

import LocaleLink from "@/components/locale-link"
import { Button } from "@/components/ui/button"
import { Heart, Users, Building2, ArrowRight } from "lucide-react"
import { motion } from "motion/react"
import { useDictionary } from "@/components/dictionary-provider"

export function MissionSection() {
  const dict = useDictionary()
  const h = dict.home || {} as any

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Mission Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium rounded-full bg-primary/10 text-primary">
              <Heart className="h-4 w-4" fill="currentColor" />
              {h.ourMission || "Our Mission"}
            </span>
          </motion.div>

          {/* Mission Statement */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance"
          >
            {h.missionTitle || "Connecting Skills with Purpose"}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty"
          >
            {h.missionDesc || "We believe everyone has the power to make a difference. JustBeCause Network connects skilled professionals with NGOs and social enterprises that need expertise — not just goodwill."}
          </motion.p>

          {/* Registration Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button 
              asChild 
              size="lg" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-lg h-14 px-8"
            >
              <LocaleLink href="/auth/signup?role=volunteer" className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {h.registerAsAgent || "Register as Candidate"}
                <ArrowRight className="h-4 w-4" />
              </LocaleLink>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-lg h-14 px-8 border-2"
            >
              <LocaleLink href="/auth/signup?role=ngo" className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {h.registerAsNGO || "Register as NGO"}
              </LocaleLink>
            </Button>
          </motion.div>

          {/* Decorative element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-16 pt-12 border-t border-border/50"
          >
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{h.stat100pct || "0%"}</div>
                <div className="text-sm text-muted-foreground">{h.statFreeForAgents || "Registration Fees"}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{h.stat247 || "24/7"}</div>
                <div className="text-sm text-muted-foreground">{h.statPlatformAccess || "Platform Access"}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{h.statGlobal || "Global"}</div>
                <div className="text-sm text-muted-foreground">{h.statCommunity || "Community"}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
