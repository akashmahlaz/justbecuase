"use client"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">Something went wrong!</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <Button onClick={() => reset()}>Try Again</Button>
          </div>
        </div>
      </body>
    </html>
  )
}
