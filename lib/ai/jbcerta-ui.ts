import type { UIMessage } from "ai"
import type { ModelId } from "@/lib/ai/providers"

export type JBCertaResultType = "volunteer" | "ngo" | "opportunity"

export type JBCertaResult = {
  type: JBCertaResultType
  id: string
  title: string
  subtitle?: string
  description?: string
  location?: string
  skills?: string[]
  score?: number
  avatar?: string
  verified?: boolean
  matchedField?: string
  url?: string
  volunteerType?: string
  workMode?: string
  experienceLevel?: string
  rating?: number
  causes?: string[]
  ngoName?: string
  status?: string
}

export type JBCertaMessageMetadata = {
  modelId?: ModelId
  modelLabel?: string
  totalTokens?: number
  createdAt?: number
}

export type JBCertaDataParts = {
  status: {
    status: "thinking" | "complete"
    modelId: ModelId
    modelLabel: string
  }
  results: {
    items: JBCertaResult[]
    modelId: ModelId
    modelLabel: string
    elapsedMs: number
  }
}

export type JBCertaUIMessage = UIMessage<JBCertaMessageMetadata, JBCertaDataParts>
