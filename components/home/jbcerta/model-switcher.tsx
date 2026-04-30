"use client"

import { CheckCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { MODEL_META, type ModelId } from "@/lib/ai/providers"
import { cn } from "@/lib/utils"
import { MODEL_IDS } from "./constants"

export function ModelSwitcher({ value, onChange }: { value: ModelId; onChange: (id: ModelId) => void }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
      >
        <Sparkles className="h-3 w-3" />
        <span>{MODEL_META[value].label}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-background shadow-lg shadow-black/10"
          >
            {MODEL_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted",
                  value === id && "bg-primary/10 font-semibold text-primary"
                )}
              >
                <Sparkles className="h-3 w-3 shrink-0" />
                <span>{MODEL_META[id].label}</span>
                {value === id && <CheckCircle className="ml-auto h-3 w-3" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
