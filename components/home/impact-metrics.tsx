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
        start += Math.ceil(end / 100);
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

  const format = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return num.toLocaleString();
    return num.toString();
  };

  return <span ref={ref}>{prefix}{format(displayValue)}{suffix}</span>;
};

export function ImpactMetrics({ impactMetrics }: { impactMetrics: any }) {
  const metrics = [
    { icon: Users, value: impactMetrics.volunteers, label: "Skilled Volunteers", color: "var(--primary)" },
    { icon: CheckCircle2, value: impactMetrics.projectsCompleted, label: "Projects Completed", color: "#10b981" },
    { icon: Building2, value: impactMetrics.ngosSupported, label: "NGOs Supported", color: "var(--secondary)" },
    { icon: Clock, value: impactMetrics.hoursContributed, label: "Hours Contributed", color: "var(--primary)", suffix: "+" },
    { icon: DollarSign, value: impactMetrics.valueGenerated, label: "Value Generated", color: "#10b981", prefix: "$" },
  ];

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-20 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Our Collective Impact</h2>
          <p className="text-muted-foreground text-lg italic">The flow of professional capital into social change.</p>
        </div>

        <div className="relative">
          {/* THE PASSING LINE: Animated SVG Path */}
          <svg
            className="absolute top-1/2 left-0 w-full h-32 -translate-y-1/2 hidden lg:block pointer-events-none"
            viewBox="0 0 1200 100"
            fill="none"
          >
            <path
              d="M0 50 Q 300 0, 600 50 T 1200 50"
              stroke="currentColor"
              className="text-border"
              strokeWidth="1"
            />
            {/* Animated Glow Pulse */}
            <motion.path
              d="M0 50 Q 300 0, 600 50 T 1200 50"
              stroke="url(#impact-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <defs>
              <linearGradient id="impact-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
                <stop offset="50%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-12 relative z-10">
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative flex flex-col items-center"
              >
                {/* Metric Node */}
                <div className="relative mb-6">
                  <div 
                    className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                    style={{ backgroundColor: metric.color }}
                  />
                  <div className="relative w-20 h-20 rounded-full bg-background border-2 border-border flex items-center justify-center group-hover:border-primary transition-colors duration-500 shadow-xl">
                    <metric.icon className="w-8 h-8 text-foreground group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <div className="text-4xl font-black tracking-tighter mb-1">
                    <Counter value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">
                    {metric.label}
                  </p>
                </div>

                {/* Vertical Line for Mobile/Tablet */}
                {idx < metrics.length - 1 && (
                  <div className="lg:hidden w-px h-12 bg-gradient-to-b from-border to-transparent mt-6" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}