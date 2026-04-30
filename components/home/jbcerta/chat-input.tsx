"use client"

import { RotateCcw, Send, Square } from "lucide-react"
import type { FormEvent, KeyboardEvent, RefObject } from "react"
import { cn } from "@/lib/utils"

type ChatInputProps = {
  input: string
  setInput: (value: string) => void
  placeholder: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  disabled: boolean
  streaming: boolean
  hasMessages: boolean
  onSubmit: (event?: FormEvent) => void
  onStop: () => void
  onReset: () => void
  onFocusChange: (focused: boolean) => void
}

export function ChatInput({
  input,
  setInput,
  placeholder,
  textareaRef,
  disabled,
  streaming,
  hasMessages,
  onSubmit,
  onStop,
  onReset,
  onFocusChange,
}: ChatInputProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(event)
      }}
      className="relative flex w-full flex-col text-left"
    >
      {hasMessages && <div className="pointer-events-none mx-5 h-px bg-border/60" />}
      <div className="max-h-48 overflow-y-auto" onClick={() => textareaRef.current?.focus()}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Ask JBCerta"
          rows={1}
          maxLength={2000}
          className="w-full resize-none border-none bg-transparent px-5 py-4 text-sm leading-snug outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="relative h-13 border-t border-border/50 bg-muted/40">
        <div className="absolute bottom-2.5 left-4 flex items-center gap-2">
          <span className="hidden text-[10px] text-muted-foreground/60 sm:block">Enter to send · Shift+Enter newline</span>
          {input.length > 0 && (
            <span className={cn("font-mono text-[10px] tabular-nums", input.length > 1800 ? "text-destructive" : "text-muted-foreground/50")}>
              {input.length}/2000
            </span>
          )}
        </div>

        <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
          {hasMessages && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-xl bg-muted p-2.5 text-foreground transition-colors hover:bg-muted/80"
              aria-label="Stop"
              title="Stop"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || disabled}
              className={cn(
                "rounded-xl p-2.5 transition-all duration-200",
                input.trim() && !disabled
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary/90"
                  : "cursor-not-allowed bg-muted text-muted-foreground/40"
              )}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
