"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { MessageSquare, Send, Loader2 } from "lucide-react"
import { startStreamConversation } from "@/lib/actions"
import { toast } from "sonner"

interface ContactVolunteerButtonProps {
  volunteerId: string
  volunteerName: string
  projectId?: string
  className?: string
  variant?: "default" | "outline" | "secondary"
}

export function ContactVolunteerButton({
  volunteerId,
  volunteerName,
  projectId,
  className,
  variant = "default",
}: ContactVolunteerButtonProps) {
  const router = useRouter()
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setIsSending(true)
    try {
      const result = await startStreamConversation(volunteerId, projectId, message.trim())
      
      if (result.success) {
        toast.success("Message sent!", {
          description: `Your message to ${volunteerName} has been sent.`,
        })
        setIsOpen(false)
        setMessage("")
        // Redirect to the messages page (ChatView will show the conversation)
        router.push(localePath(`/ngo/messages`, locale))
      } else {
        toast.error("Failed to send message", {
          description: result.error || "Please try again",
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact Impact Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message {volunteerName}</DialogTitle>
          <DialogDescription>
            Send a message to start a conversation with this impact agent.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Hi! I came across your profile and would love to discuss a potential opportunity..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be specific about what you're looking for and how this impact agent can help.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
