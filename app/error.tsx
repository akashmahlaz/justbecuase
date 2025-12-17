"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Home, RefreshCw, Bug } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            We apologize for the inconvenience. An unexpected error occurred while processing your request.
          </p>
          
          {error.digest && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Error ID: <code className="text-primary">{error.digest}</code>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">
              If this problem persists, please contact support.
            </p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/contact">
                <Bug className="h-4 w-4 mr-2" />
                Report Issue
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
