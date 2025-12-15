"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle } from "lucide-react"
import { applyToProject } from "@/lib/actions"

interface ApplyButtonProps {
  projectId: string
  projectTitle: string
  hasApplied?: boolean
}

export function ApplyButton({ projectId, projectTitle, hasApplied = false }: ApplyButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(hasApplied)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)

    try {
      // Build cover message from form fields
      const coverMessage = [
        `Interest: ${formData.get("interest") || ""}`,
        `Experience: ${formData.get("experience") || ""}`,
        `Portfolio: ${formData.get("portfolio") || ""}`,
        `Availability: ${formData.get("availability") || ""}`,
      ].filter(s => !s.endsWith(": ")).join("\n\n")

      const result = await applyToProject(projectId, coverMessage)

      if (result.success) {
        setSubmitted(true)
        setTimeout(() => {
          setIsOpen(false)
          setSubmitted(false)
          router.refresh()
        }, 2000)
      } else {
        setError(result.error || "Failed to submit application")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full bg-primary hover:bg-primary/90" 
          size="lg"
          disabled={hasApplied}
        >
          {hasApplied ? "Applied" : "Apply Now"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>Apply for this Project</DialogTitle>
          <DialogDescription>
            Tell the organization why you&apos;re interested and how you can help.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Application Submitted!</h3>
            <p className="text-muted-foreground">
              The organization will review your application and get back to you soon.
            </p>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="interest">Why are you interested in this project?</Label>
              <Textarea
                id="interest"
                name="interest"
                placeholder="Share what excites you about this opportunity..."
                className="mt-2"
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="experience">Relevant experience</Label>
              <Textarea
                id="experience"
                name="experience"
                placeholder="Describe your relevant skills and past projects..."
                className="mt-2"
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="portfolio">Portfolio or LinkedIn URL (optional)</Label>
              <Input id="portfolio" name="portfolio" type="url" placeholder="https://" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="availability">Your availability</Label>
              <Input
                id="availability"
                name="availability"
                placeholder="e.g., Weekday evenings, 10 hours/week"
                className="mt-2"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
