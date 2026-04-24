"use client"

import { useState, useEffect } from "react"
import LocaleLink from "@/components/locale-link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Search,
  MessageSquare,
  User,
  Building2,
  Clock,
  Filter,
  SortAsc,
  Inbox,
  Star,
  Archive,
} from "lucide-react"
import { useLocale } from "@/hooks/use-locale"

interface Conversation {
  _id?: { toString: () => string } | string
  participants: string[]
  lastMessage?: string
  lastMessageAt?: Date | string
  unreadCount?: number
  volunteerName?: string
  volunteerAvatar?: string
  ngoName?: string
  ngoLogo?: string
  otherParticipantType?: "volunteer" | "ngo"
  projectId?: string
}

interface ConversationsListProps {
  initialConversations: Conversation[]
  userType: "volunteer" | "ngo"
  baseUrl: string
}

function formatRelativeTime(date: Date | string, locale?: string): string {
  const now = new Date()
  const messageDate = new Date(date)
  const diffMs = now.getTime() - messageDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  
  return messageDate.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  })
}

function ConversationItem({ 
  conversation, 
  userType,
  baseUrl,
  isSelected = false 
}: { 
  conversation: Conversation
  userType: "volunteer" | "ngo"
  baseUrl: string
  isSelected?: boolean
}) {
  const lastMessage = conversation.lastMessage
  const unreadCount = conversation.unreadCount || 0
  const hasUnread = unreadCount > 0
  const locale = useLocale()

  const name = userType === "ngo" 
    ? (conversation.volunteerName || "Impact Agent")
    : (conversation.ngoName || "NGO")
  
  const avatar = userType === "ngo"
    ? conversation.volunteerAvatar
    : conversation.ngoLogo

  const Icon = userType === "ngo" ? User : Building2

  const conversationId = typeof conversation._id === "string" 
    ? conversation._id 
    : conversation._id?.toString()

  return (
    <LocaleLink
      href={`${baseUrl}/${conversationId}`}
      className={cn(
        "block p-4 transition-all duration-200",
        "hover:bg-muted/50 border-l-2 border-transparent",
        isSelected && "bg-muted border-l-primary",
        hasUnread && !isSelected && "bg-primary/5 border-l-primary/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0",
          "bg-gradient-to-br from-primary/20 to-primary/5 ring-2",
          hasUnread ? "ring-primary/30" : "ring-transparent"
        )}>
          {avatar ? (
            <img 
              src={avatar} 
              alt={name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className="h-5 w-5 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              "font-medium truncate",
              hasUnread ? "text-foreground" : "text-foreground/80"
            )}>
              {name}
            </span>
            {conversation.lastMessageAt && (
              <span className={cn(
                "text-xs flex-shrink-0 ml-2",
                hasUnread ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {formatRelativeTime(conversation.lastMessageAt, locale)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm truncate flex-1",
              hasUnread 
                ? "text-foreground font-medium" 
                : "text-muted-foreground"
            )}>
              {lastMessage || "No messages yet"}
            </p>
            
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground h-5 min-w-[20px] flex items-center justify-center text-xs font-semibold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </LocaleLink>
  )
}

function EmptyState({ userType }: { userType: "volunteer" | "ngo" }) {
  return (
    <div className="py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-2">No conversations yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {userType === "ngo" 
          ? "Messages with impact agents will appear here when you start a conversation"
          : "Apply to opportunities or receive messages from NGOs to start chatting"
        }
      </p>
    </div>
  )
}

function ConversationSkeleton() {
  return (
    <div className="p-4 flex items-start gap-3">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

export function ConversationsList({ 
  initialConversations, 
  userType,
  baseUrl 
}: ConversationsListProps) {
  const [conversations, setConversations] = useState(initialConversations)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [isLoading, setIsLoading] = useState(false)

  // Calculate stats
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
  const unreadConversations = conversations.filter(c => (c.unreadCount || 0) > 0)

  // Filter and search conversations
  const filteredConversations = conversations.filter(conv => {
    // Apply search filter
    const name = userType === "ngo" 
      ? (conv.volunteerName || "")
      : (conv.ngoName || "")
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase())

    // Apply read/unread filter
    const matchesFilter = filter === "all" || 
      (filter === "unread" && (conv.unreadCount || 0) > 0)

    return matchesSearch && matchesFilter
  })

  return (
    <Card className="h-[600px] flex flex-col overflow-hidden">
      {/* Header with search and filters */}
      <CardHeader className="pb-3 border-b space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="pl-9 bg-muted/50 border-0" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="h-7 text-xs"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            All
          </Button>
          <Button
            variant={filter === "unread" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="h-7 text-xs"
          >
            <Inbox className="h-3 w-3 mr-1" />
            Unread
            {totalUnread > 0 && (
              <Badge className="ml-1 h-4 min-w-[16px] text-[10px] bg-primary/20 text-primary">
                {totalUnread}
              </Badge>
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Conversations list */}
      <CardContent className="flex-1 overflow-y-auto p-0">
        {isLoading ? (
          <div className="divide-y">
            {[1, 2, 3, 4].map(i => <ConversationSkeleton key={i} />)}
          </div>
        ) : filteredConversations.length === 0 ? (
          searchQuery || filter !== "all" ? (
            <div className="py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No matching conversations</p>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => { setSearchQuery(""); setFilter("all"); }}
                className="mt-2"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <EmptyState userType={userType} />
          )
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={typeof conversation._id === "string" 
                  ? conversation._id 
                  : conversation._id?.toString()}
                conversation={conversation}
                userType={userType}
                baseUrl={baseUrl}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Footer with stats */}
      {conversations.length > 0 && (
        <div className="border-t p-3 bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? "s" : ""}
            {totalUnread > 0 && ` Ã¢â‚¬Â¢ ${totalUnread} unread`}
          </p>
        </div>
      )}
    </Card>
  )
}
