"use client";

import { motion } from "framer-motion";
import { Link2, Zap, ShieldCheck, Globe2, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const connectionStats = [
  { label: "Active Connections", value: "1,284", icon: Link2, color: "text-primary" },
  { label: "Trust Score", value: "99.8%", icon: ShieldCheck, color: "text-emerald-500" },
  { label: "Global Reach", value: "24+", icon: Globe2, color: "text-secondary" },
];

export function ConnectivityNetwork() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-5 gap-8 items-stretch">
          
          {/* Left Side: Stats (2 Columns) */}
          <div className="lg:col-span-2 flex flex-col justify-center space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-black tracking-tight text-foreground mb-4">
                The Network <br />
                <span className="text-primary text-5xl">Pulse</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-sm mb-8">
                Our ecosystem thrives on high-speed professional exchange, moving expertise to where it is needed most.
              </p>
            </motion.div>

            <div className="grid gap-4">
              {connectionStats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between group hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-background border border-border group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <span className="text-xl font-black text-foreground">{stat.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Side: The Abstract Network (3 Columns) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-3 relative min-h-[450px] rounded-[3rem] border border-border bg-muted/20 overflow-hidden flex items-center justify-center p-12"
          >
            {/* The "Passing Lines" SVG Background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 400 400">
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                {/* Abstract animated lines */}
                <motion.path 
                    d="M 50 100 Q 200 50 350 100" 
                    stroke="url(#lineGradient)" 
                    strokeWidth="0.5" 
                    fill="transparent"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <motion.path 
                    d="M 50 300 Q 200 350 350 300" 
                    stroke="url(#lineGradient)" 
                    strokeWidth="0.5" 
                    fill="transparent"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1 }}
                />
            </svg>

            {/* Central Node Visual */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                {/* Concentric Pulsing Circles */}
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-[ping_3s_infinite]" />
                
                <div className="relative w-32 h-32 rounded-full bg-card border-4 border-background shadow-2xl flex items-center justify-center">
                  <Zap className="w-12 h-12 text-primary fill-primary/10" />
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <div className="px-4 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-black uppercase tracking-tighter mb-2 inline-block">
                  System Live
                </div>
                <h3 className="text-xl font-bold text-foreground">Cross-Border Exchange</h3>
              </div>
            </div>

            {/* Orbiting Elements (Volunteers & NGOs) */}
            <FloatingNode label="Elite Talent" position="top-12 left-12" delay={0} />
            <FloatingNode label="Grassroots NGO" position="bottom-16 left-20" delay={1} />
            <FloatingNode label="Impact Project" position="top-20 right-16" delay={2} />
            <FloatingNode label="Professional" position="bottom-20 right-20" delay={1.5} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FloatingNode({ label, position, delay }: { label: string, position: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, delay, ease: "easeInOut" }}
      className={`absolute ${position} hidden md:flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-lg z-20`}
    >
      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{label}</span>
      <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
    </motion.div>
  );
}