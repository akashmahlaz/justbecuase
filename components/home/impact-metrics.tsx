"use client";

import { motion } from "framer-motion";
import { Users, CheckCircle2, Building2, Clock, DollarSign } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";

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

          <div className="grid grid-cols-1 md:grid-cols-5">
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="relative group pt-12 pb-8 md:px-8 border-l border-border/40 last:border-r"
              >
                {/* Connector Dot to the Spine */}
                <div className="absolute -top-[5px] left-[-5px] md:left-[-5px]">
                  <div className="w-[9px] h-[9px] rounded-full border border-border bg-background group-hover:border-primary group-hover:bg-primary transition-all duration-500" />
                </div>

                <div className="space-y-6">
                  {/* Icon with refined styling */}
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/30 text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-all">
                    <metric.icon strokeWidth={1.5} className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl xl:text-4xl font-semibold tracking-tight text-foreground">
                      <Counter value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">
                      {metric.label}
                    </p>
                  </div>
                </div>

                {/* Subtle Background Interaction */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}