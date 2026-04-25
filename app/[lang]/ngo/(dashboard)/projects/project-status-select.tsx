"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDictionary } from "@/components/dictionary-provider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, AlertTriangle } from "lucide-react"
import { updateProject } from "@/lib/actions"
import { toast } from "sonner"

interface ProjectStatusSelectProps {
  projectId: string
  currentStatus: string
  projectTitle: string
}

const statusOptions = [
  { value: "open", label: "Open", color: "text-green-600" },
  { value: "active", label: "Active", color: "text-green-600" },
  { value: "paused", label: "Paused", color: "text-yellow-600" },
  { value: "closed", label: "Closed", color: "text-gray-600" },
  { value: "completed", label: "Completed", color: "text-blue-600" },
]

export function ProjectStatusSelect({ projectId, currentStatus, projectTitle }: ProjectStatusSelectProps) {
  const router = useRouter()
  const dict = useDictionary() as any
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return

    // For destructive status changes, confirm first
    if (newStatus === "closed" || newStatus === "completed" || newStatus === "cancelled") {
      setPendingStatus(newStatus)
      setConfirmOpen(true)
      return
    }

    doStatusUpdate(newStatus)
  }

  const doStatusUpdate = async (status: string) => {
    setIsUpdating(true)
    setConfirmOpen(false)
    try {
      const result = await updateProject(projectId, { status } as any)
      if (result.success) {
        toast.success(dict.ngo?.projects?.statusUpdated || "Status updated", {
          description: `"${projectTitle}" is now ${status}.`,
        })
        router.refresh()
      } else {
        toast.error(result.error || (dict.ngo?.projects?.statusUpdateFailed || "Failed to update status"))
      }
    } catch {
      toast.error(dict.ngo?.common?.unexpectedError || "An error occurred")
    } finally {
      setIsUpdating(false)
      setPendingStatus(null)
    }
  }

  return (
    <>
      <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isUpdating}>
        <SelectTrigger className="w-32.5 h-8 text-xs">
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className={opt.color}>{dict.ngo?.common?.[opt.value] || opt.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {dict.ngo?.projects?.confirmStatusChange || "Confirm Status Change"}
            </DialogTitle>
            <DialogDescription>
              {(dict.ngo?.projects?.confirmStatusDesc || 'Are you sure you want to mark "{title}" as {status}? Applicants will be notified.')
                .replace("{title}", projectTitle)
                .replace("{status}", pendingStatus || "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setPendingStatus(null) }}>
              {dict.ngo?.common?.cancel || "Cancel"}
            </Button>
            <Button
              onClick={() => pendingStatus && doStatusUpdate(pendingStatus)}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {dict.ngo?.common?.confirm || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
