"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDictionary } from "@/components/dictionary-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CheckCircle, XCircle, Star, Loader2, MessageSquare } from "lucide-react"
import { updateApplicationStatus } from "@/lib/actions"
import { toast } from "sonner"

interface ApplicationActionsProps {
  applicationId: string
  currentStatus: string
  volunteerName?: string
}

export function ApplicationActions({ applicationId, currentStatus, volunteerName }: ApplicationActionsProps) {
  const router = useRouter()
  const dict = useDictionary() as any
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<"accepted" | "rejected" | null>(null)
  const [notes, setNotes] = useState("")

  const handleQuickAction = async (newStatus: "shortlisted") => {
    setIsLoading(newStatus)
    try {
      const result = await updateApplicationStatus(applicationId, newStatus)
      if (result.success) {
        toast.success(dict.ngo?.applications?.shortlisted || "Application shortlisted", {
          description: volunteerName
            ? `${volunteerName} has been shortlisted.`
            : dict.ngo?.applications?.shortlistedDesc || "The applicant has been shortlisted.",
        })
        router.refresh()
      } else {
        toast.error(result.error || (dict.ngo?.applications?.updateError || "Failed to update application status"))
      }
    } catch {
      toast.error(dict.ngo?.applications?.updateErrorGeneric || "An error occurred while updating the application")
    } finally {
      setIsLoading(null)
    }
  }

  const openConfirmDialog = (action: "accepted" | "rejected") => {
    setPendingAction(action)
    setNotes("")
    setDialogOpen(true)
  }

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    setIsLoading(pendingAction)
    setDialogOpen(false)
    try {
      const result = await updateApplicationStatus(applicationId, pendingAction, notes.trim() || undefined)
      if (result.success) {
        const isAccepted = pendingAction === "accepted"
        toast.success(
          isAccepted
            ? dict.ngo?.applications?.acceptedSuccess || "Application accepted!"
            : dict.ngo?.applications?.rejectedSuccess || "Application rejected",
          {
            description: isAccepted
              ? (volunteerName ? `${volunteerName} will be notified.` : dict.ngo?.applications?.volunteerNotified || "The volunteer will be notified via email.")
              : dict.ngo?.applications?.rejectedDesc || "The applicant has been notified.",
          }
        )
        router.refresh()
      } else {
        toast.error(result.error || (dict.ngo?.applications?.updateError || "Failed to update application status"))
      }
    } catch {
      toast.error(dict.ngo?.applications?.updateErrorGeneric || "An error occurred")
    } finally {
      setIsLoading(null)
      setPendingAction(null)
      setNotes("")
    }
  }

  const confirmDialogConfig = {
    accepted: {
      title: dict.ngo?.applications?.confirmAccept || "Accept this applicant?",
      description: volunteerName
        ? `${volunteerName} will be notified by email that their application has been accepted.`
        : dict.ngo?.applications?.confirmAcceptDesc || "The volunteer will be notified via email.",
      confirmLabel: dict.ngo?.applications?.accept || "Accept",
      confirmClass: "bg-green-600 hover:bg-green-700 text-white",
      notesPlaceholder: dict.ngo?.applications?.acceptNotesPlaceholder || "Add a welcome message or next steps (optional)...",
    },
    rejected: {
      title: dict.ngo?.applications?.confirmReject || "Reject this applicant?",
      description: volunteerName
        ? `${volunteerName} will be notified that their application was not selected.`
        : dict.ngo?.applications?.confirmRejectDesc || "The volunteer will be notified via email.",
      confirmLabel: dict.ngo?.applications?.reject || "Reject",
      confirmClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
      notesPlaceholder: dict.ngo?.applications?.rejectNotesPlaceholder || "Add feedback for the applicant (optional)...",
    },
  }

  const config = pendingAction ? confirmDialogConfig[pendingAction] : null

  if (currentStatus === "pending") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50"
          onClick={() => handleQuickAction("shortlisted")}
          disabled={isLoading !== null}
        >
          {isLoading === "shortlisted" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Star className="h-4 w-4 mr-1" />
          )}
          {dict.ngo?.applications?.shortlist || "Shortlist"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent text-green-600 border-green-600 hover:bg-green-50"
          onClick={() => openConfirmDialog("accepted")}
          disabled={isLoading !== null}
        >
          {isLoading === "accepted" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1" />
          )}
          {dict.ngo?.applications?.accept || "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent text-destructive border-destructive hover:bg-destructive/5"
          onClick={() => openConfirmDialog("rejected")}
          disabled={isLoading !== null}
        >
          {isLoading === "rejected" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-1" />
          )}
          {dict.ngo?.applications?.reject || "Reject"}
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{config?.title}</DialogTitle>
              <DialogDescription>{config?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                <MessageSquare className="h-3.5 w-3.5 inline mr-1.5" />
                {dict.ngo?.applications?.noteToApplicant || "Note to applicant"}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={config?.notesPlaceholder}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {dict.ngo?.applications?.noteIncludedInEmail || "This note will be included in the notification email."}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {dict.ngo?.common?.cancel || "Cancel"}
              </Button>
              <Button
                className={config?.confirmClass}
                onClick={handleConfirmAction}
                disabled={isLoading !== null}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : pendingAction === "accepted" ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                {config?.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (currentStatus === "shortlisted") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent text-green-600 border-green-600 hover:bg-green-50"
          onClick={() => openConfirmDialog("accepted")}
          disabled={isLoading !== null}
        >
          {isLoading === "accepted" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1" />
          )}
          {dict.ngo?.applications?.accept || "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent text-destructive border-destructive hover:bg-destructive/5"
          onClick={() => openConfirmDialog("rejected")}
          disabled={isLoading !== null}
        >
          {isLoading === "rejected" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-1" />
          )}
          {dict.ngo?.applications?.reject || "Reject"}
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{config?.title}</DialogTitle>
              <DialogDescription>{config?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="notes-shortlisted" className="text-sm font-medium">
                <MessageSquare className="h-3.5 w-3.5 inline mr-1.5" />
                {dict.ngo?.applications?.noteToApplicant || "Note to applicant"}
              </Label>
              <Textarea
                id="notes-shortlisted"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={config?.notesPlaceholder}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {dict.ngo?.applications?.noteIncludedInEmail || "This note will be included in the notification email."}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {dict.ngo?.common?.cancel || "Cancel"}
              </Button>
              <Button
                className={config?.confirmClass}
                onClick={handleConfirmAction}
                disabled={isLoading !== null}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : pendingAction === "accepted" ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                {config?.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (currentStatus === "accepted") {
    return (
      <Button size="sm" variant="outline" className="bg-transparent">
        <MessageSquare className="h-4 w-4 mr-1" />
        {dict.ngo?.common?.message || "Message"}
      </Button>
    )
  }

  return null
}
