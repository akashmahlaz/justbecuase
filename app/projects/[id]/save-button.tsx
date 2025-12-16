"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Bookmark, Loader2 } from "lucide-react"
import { toggleSaveProject } from "@/lib/actions"

interface SaveButtonProps {
  projectId: string
  initialSaved: boolean
}

export function SaveButton({ projectId, initialSaved }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await toggleSaveProject(projectId)
      if (result.success && result.data) {
        setIsSaved(result.data.isSaved)
      }
    })
  }

  return (
    <Button
      variant="outline"
      className={`flex-1 bg-transparent ${isSaved ? "border-primary text-primary" : ""}`}
      onClick={handleSave}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-primary" : ""}`} />
      )}
      {isSaved ? "Saved" : "Save"}
    </Button>
  )
}
