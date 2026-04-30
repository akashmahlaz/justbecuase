"use client"

import { useCallback, useEffect, useState } from "react"
import type { ModelId } from "@/lib/ai/providers"
import { JBCERTA_MODEL_STORAGE_KEY, MODEL_IDS } from "./constants"

export function useStoredModel(defaultModel: ModelId = "minimax") {
  const [selectedModel, setSelectedModel] = useState<ModelId>(defaultModel)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(JBCERTA_MODEL_STORAGE_KEY)
      if (stored && MODEL_IDS.includes(stored as ModelId)) {
        setSelectedModel(stored as ModelId)
      }
    } catch {}
  }, [])

  const updateModel = useCallback((modelId: ModelId) => {
    setSelectedModel(modelId)
    try {
      localStorage.setItem(JBCERTA_MODEL_STORAGE_KEY, modelId)
    } catch {}
  }, [])

  return [selectedModel, updateModel] as const
}

export function useCyclingPlaceholder(prompts: string[], paused: boolean, intervalMs = 2800) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % prompts.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs, paused, prompts.length])

  return prompts[index]
}
