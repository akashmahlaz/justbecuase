"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { sendMessage } from "@/lib/actions"
import {
  Send,
  ArrowLeft,
  Building2,
  User,
  Check,
  CheckCheck,
  Loader2,
  Briefcase,
} from "lucide-react"
import Link from "next/link"

interface Message {
  _id?: { toString: () => string }
  senderId: string
  content: string
  isRead: boolean
  createdAt: Date
}

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  otherParticipant: {
    id: string
    name: string
    avatar?: string
    type: "volunteer" | "ngo"
  }
  messages: Message[]
  projectTitle?: string
  projectId?: string
  backUrl: string
}

export function MessageThread({
  conversationId,
  currentUserId,
  otherParticipant,
  messages,
  projectTitle,
  projectId,
  backUrl,
}: MessageThreadProps) {
  const router = useRouter()
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const result = await sendMessage(
        otherParticipant.id,
        newMessage.trim(),
        projectId
      )
      if (result.success) {
        setNewMessage("")
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) {
      return "Today"
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    }
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ""

  messages.forEach((message) => {
    const messageDate = formatDate(message.createdAt)
    if (messageDate !== currentDate) {
      currentDate = messageDate
      groupedMessages.push({ date: messageDate, messages: [message] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message)
    }
  })

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {otherParticipant.avatar ? (
              <img
                src={otherParticipant.avatar}
                alt={otherParticipant.name}
                className="w-full h-full object-cover"
              />
            ) : otherParticipant.type === "ngo" ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{otherParticipant.name}</CardTitle>
            {projectTitle && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span className="truncate">{projectTitle}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupedMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <Send className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date separator */}
                <div className="flex items-center gap-2 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Messages for this date */}
                {group.messages.map((message) => {
                  const isOwn = message.senderId === currentUserId

                  return (
                    <div
                      key={message._id?.toString() || Math.random()}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}
                    >
                      <div
                        className={`max-w-[75%] ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        } rounded-2xl px-4 py-2.5`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 ${
                            isOwn
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-xs">
                            {formatTime(message.createdAt)}
                          </span>
                          {isOwn && (
                            message.isRead ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>

      {/* Input */}
      <div className="flex-shrink-0 border-t p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  )
}
