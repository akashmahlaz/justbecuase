"use client";

import { motion } from "motion/react";
import { Users, CheckCircle2, Building2, Clock, DollarSign } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useInView } from "motion/react";
import { Box } from "@mui/material";

const Counter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = value;
      const timer = setInterval(() => {
        const step = Math.max(1, Math.ceil(end / 60));
        start += step;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(start);
        }
      }, 20);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref} className="tabular-nums font-medium">{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

export function ImpactMetrics({ impactMetrics }: { impactMetrics: any }) {
  const metrics = [
    { icon: Users, value: impactMetrics.volunteers, label: "Skilled Volunteers" },
    { icon: CheckCircle2, value: impactMetrics.projectsCompleted, label: "Projects Completed" },
    { icon: Building2, value: impactMetrics.ngosSupported, label: "NGOs Supported" },
    { icon: Clock, value: impactMetrics.hoursContributed, label: "Hours Contributed", suffix: "+" },
    { icon: DollarSign, value: impactMetrics.valueGenerated, label: "Value Generated", prefix: "$" },
  ];

  return (
    <section className="py-32 bg-background border-y border-border/40">
      <div className="container mx-auto px-6">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
          <div className="max-w-xl">
            <h2 className="text-5xl md:text-7xl font-light tracking-tighter text-foreground mb-6">
              Our <span className="font-semibold">Momentum.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed border-l-2 border-primary pl-6">
              A quantitative overview of how professional skills are fueling social progress across the region.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">Annual Report 2025</span>
          </div>
        </div>

        {/* THE SPINE: Architectural Line Passing Through */}
        <div className="relative pt-20">
          {/* Main Horizontal Laser Line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-border/60">
            {/* The "Pulse" - Moving Laser */}
            <motion.div 
              initial={{ left: "-20%" }}
              animate={{ left: "120%" }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 w-48 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="relative group h-full"
              >
                {/* SyncUI Animated Border Card Implementation */}
                <Box
                  sx={{
                    position: "relative",
                    height: "100%",
                    borderRadius: 3, // Approx 12px
                    overflow: "hidden",
                    backgroundColor: "transparent",
                    boxShadow: "0 10px 30px -15px rgba(0,0,0,0.1)",
                    border: "1px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                    // Ensure the box establishes a positioning context
                    isolation: "isolate",
                  }}
                >
                  {/* 1. The Rotating Gradient Border (Behind) */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: -1, // Extends 1px outside to create the border
                      overflow: "hidden",
                      borderRadius: "inherit",
                      zIndex: 0,
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        inset: "-50%", // Make it large enough to cover rotation
                        background: "conic-gradient(from 0deg, transparent 0 340deg, hsl(var(--primary)) 360deg)",
                        animation: "rotate 4s linear infinite",
                      },
                      "@keyframes rotate": {
                        from: { transform: "rotate(0deg)" },
                        to: { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                  
                  {/* 2. The Inner Background (Masking the center) */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 1, // Leaves 1px gap for the border to show
                      borderRadius: "inherit",
                      backgroundColor: "hsl(var(--background))",
                      zIndex: 1,
                    }}
                  />
                  
                  {/* 3. The Content (On top) */}
                  <div className="relative z-10 p-8 h-full">
                    {/* Connector Dot to the Spine */}
                    <div className="absolute -top-[25px] left-1/2 -translate-x-1/2">
                      <div className="w-[9px] h-[9px] rounded-full border-2 border-border bg-background group-hover:border-primary group-hover:bg-primary transition-all duration-500 shadow-lg" />
                    </div>

                    <div className="space-y-6">
                      {/* Icon with refined styling */}
                      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary/5 text-primary/60 group-hover:text-primary group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300 shadow-sm">
                        <metric.icon strokeWidth={1.5} className="w-6 h-6" />
                      </div>

                      <div className="space-y-2">
                        <div className="text-4xl xl:text-5xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                          <Counter value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                          {metric.label}
                        </p>
                      </div>
                    </div>

                    {/* Glow Effect on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
                  </div>
                </Box>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}