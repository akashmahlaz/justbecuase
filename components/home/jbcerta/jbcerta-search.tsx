"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Bot, Eye, EyeOff, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { useDictionary } from "@/components/dictionary-provider"
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea"
import type { JBCertaUIMessage } from "@/lib/ai/jbcerta-ui"
import { cn } from "@/lib/utils"
import { ChatInput } from "./chat-input"
import { PLACEHOLDER_PROMPTS, SUGGESTIONS } from "./constants"
import { useCyclingPlaceholder, useStoredModel } from "./hooks"
import { MessageRow } from "./message-row"
import { ModelSwitcher } from "./model-switcher"

export function JBCertaSearch() {
  const dict = useDictionary()
  const searchCopy = (dict as { search?: Record<string, string> }).search || {}
  const [input, setInput] = useState("")
  const [showReasoning, setShowReasoning] = useState(true)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedModel, setSelectedModel] = useStoredModel("minimax")
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 56, maxHeight: 200 })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, stop, error, regenerate, setMessages, clearError } = useChat<JBCertaUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/jbcerta-chat" }),
    experimental_throttle: 50,
  })

  const hasMessages = messages.length > 0
  const streaming = status === "submitted" || status === "streaming"
  const placeholder = useCyclingPlaceholder(PLACEHOLDER_PROMPTS, isFocused || input.length > 0)

  useEffect(() => {
    if (hasMessages) messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [hasMessages, messages])

  useEffect(() => {
    adjustHeight()
  }, [adjustHeight, input])

  const submit = async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput("")
    adjustHeight(true)
    clearError()
    await sendMessage(
      { text },
      {
        headers: { "x-model-id": selectedModel },
      }
    )
  }

  const reset = () => {
    stop()
    clearError()
    setInput("")
    setMessages([])
    adjustHeight(true)
  }

  const retry = async () => {
    clearError()
    await regenerate({ headers: { "x-model-id": selectedModel } })
  }

  return (
    <section className="flex min-h-screen flex-col justify-center bg-muted/15 py-16">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl"
        >
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {searchCopy.jbcertaBrand || "Powered by JBCerta AI"}
            </div>
            <h2 className="mb-3 text-3xl font-extrabold text-foreground md:text-4xl">
              {searchCopy.findTitle || "Intelligent Search Engine"}
            </h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground md:text-base">
              {searchCopy.findSubtitle || "Ask anything about Impact Agents, NGOs, and opportunities. JBCerta searches the platform in real time."}
            </p>
          </div>

          <div
            className={cn(
              "relative overflow-hidden rounded-3xl bg-background shadow-xl shadow-primary/5 ring-1 ring-border",
              isFocused && "shadow-2xl shadow-primary/10 ring-2 ring-primary/40"
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/30" />
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">JBCerta</p>
                  <p className="text-[10px] text-muted-foreground">
                    {streaming ? (
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Thinking...
                      </span>
                    ) : (
                      "Ready"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReasoning((current) => !current)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                    showReasoning
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  title={showReasoning ? "Hide AI reasoning" : "Show AI reasoning"}
                >
                  {showReasoning ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  <span className="ml-1 hidden sm:inline">Reasoning</span>
                </button>
                <ModelSwitcher value={selectedModel} onChange={setSelectedModel} />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {hasMessages && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                    {messages.map((message, index) => (
                      <MessageRow
                        key={message.id}
                        message={message}
                        streaming={streaming && index === messages.length - 1 && message.role === "assistant"}
                        showReasoning={showReasoning}
                        showFeedback={status === "ready" && message.role === "assistant"}
                      />
                    ))}
                    {error && (
                      <div className="ml-11 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                        <p>{error.message || "Something went wrong."}</p>
                        <button type="button" onClick={retry} className="mt-2 font-semibold underline-offset-4 hover:underline">
                          Retry
                        </button>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ChatInput
              input={input}
              setInput={setInput}
              placeholder={placeholder}
              textareaRef={textareaRef}
              disabled={status === "error"}
              streaming={streaming}
              hasMessages={hasMessages}
              onSubmit={submit}
              onStop={stop}
              onReset={reset}
              onFocusChange={setIsFocused}
            />
          </div>

          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 flex flex-wrap justify-center gap-2"
            >
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-xs shadow-sm transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
