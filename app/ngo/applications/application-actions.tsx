"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Star, Loader2, MessageSquare } from "lucide-react"
import { updateApplicationStatus } from "@/lib/actions"

interface ApplicationActionsProps {
  applicationId: string
  currentStatus: string
}

export function ApplicationActions({ applicationId, currentStatus }: ApplicationActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleStatusUpdate = async (newStatus: "shortlisted" | "accepted" | "rejected") => {
    setIsLoading(newStatus)
    try {
      const result = await updateApplicationStatus(applicationId, newStatus)
      if (result.success) {
        router.refresh()
      } else {
        console.error("Failed to update status:", result.error)
        alert(result.error || "Failed to update application status")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      alert("An error occurred while updating the application")
    } finally {
      setIsLoading(null)
    }
  }

  if (currentStatus === "pending") {
    return (
      <>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-transparent text-blue-600 border-blue-600"
          onClick={() => handleStatusUpdate("shortlisted")}
          disabled={isLoading !== null}
        >
          {isLoading === "shortlisted" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Star className="h-4 w-4 mr-1" />
          )}
          Shortlist
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-transparent text-green-600 border-green-600"
          onClick={() => handleStatusUpdate("accepted")}
          disabled={isLoading !== null}
        >
          {isLoading === "accepted" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1" />
          )}
          Accept
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-transparent text-destructive border-destructive"
          onClick={() => handleStatusUpdate("rejected")}
          disabled={isLoading !== null}
        >
          {isLoading === "rejected" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-1" />
          )}
          Reject
        </Button>
      </>
    )
  }

  if (currentStatus === "shortlisted") {
    return (
      <>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-transparent text-green-600 border-green-600"
          onClick={() => handleStatusUpdate("accepted")}
          disabled={isLoading !== null}
        >
          {isLoading === "accepted" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1" />
          )}
          Accept
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-transparent text-destructive border-destructive"
          onClick={() => handleStatusUpdate("rejected")}
          disabled={isLoading !== null}
        >
          {isLoading === "rejected" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-1" />
          )}
          Reject
        </Button>
      </>
    )
  }

  if (currentStatus === "accepted") {
    return (
      <Button size="sm" variant="outline" className="bg-transparent">
        <MessageSquare className="h-4 w-4 mr-1" />
        Message
      </Button>
    )
  }

  return null
}
