import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getMyConversations } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { VolunteerSidebar } from "@/components/dashboard/volunteer-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  Search,
  MessageSquare,
  Building2,
  Clock,
  Check,
  CheckCheck,
} from "lucide-react"

export default async function VolunteerMessagesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const conversations = await getMyConversations()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userType="volunteer"
        userName={session.user.name || "Volunteer"}
        userAvatar={session.user.image || undefined}
      />

      <div className="flex">
        <VolunteerSidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Messages</h1>
            <p className="text-muted-foreground">
              Communicate with NGOs about your applications
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search conversations..." className="pl-9" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {conversations.length === 0 ? (
                    <div className="py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No conversations yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Apply to projects to start chatting with NGOs
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {conversations.map((conversation) => (
                        <ConversationItem
                          key={conversation._id?.toString()}
                          conversation={conversation}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Message Thread */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-foreground mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Choose a conversation from the list to view messages and continue chatting
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function ConversationItem({ conversation }: { conversation: any }) {
  const lastMessage = conversation.lastMessage
  const unreadCount = conversation.unreadCount || 0

  return (
    <Link
      href={`/volunteer/messages/${conversation._id?.toString()}`}
      className="block p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {conversation.ngoLogo ? (
            <img 
              src={conversation.ngoLogo} 
              alt={conversation.ngoName || "NGO"} 
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-foreground truncate">
              {conversation.ngoName || "NGO"}
            </span>
            {conversation.lastMessageAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(conversation.lastMessageAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage || "No messages yet"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">
            {unreadCount}
          </Badge>
        )}
      </div>
    </Link>
  )
}
