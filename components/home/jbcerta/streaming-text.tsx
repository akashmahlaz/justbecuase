export function StreamingText({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <p className="whitespace-pre-wrap" style={{ overflowWrap: "break-word" }}>
      {text}
      {streaming && (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-primary/70 align-middle" />
      )}
    </p>
  )
}
