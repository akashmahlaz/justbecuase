import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getConversation, getConversationMessages } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { VolunteerSidebar } from "@/components/dashboard/volunteer-sidebar"
import { MessageThread } from "@/components/messages/message-thread"
import { getUserInfo } from "@/lib/user-utils"
import { getDb } from "@/lib/database"
import { ObjectId } from "mongodb"

interface Props {
  params: Promise<{ id: string }>
}

export default async function VolunteerMessageThreadPage({ params }: Props) {
  const { id } = await params
  
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const conversation = await getConversation(id)

  if (!conversation) {
    notFound()
  }

  // Get messages
  const messages = await getConversationMessages(id)

  // Find the other participant (NGO)
  const otherParticipantId = conversation.participants.find(
    (p: string) => p !== session.user.id
  )

  if (!otherParticipantId) {
    notFound()
  }

  // Get NGO info using centralized utility
  const ngoInfo = await getUserInfo(otherParticipantId)

  // Get project title if related to a project
  let projectTitle: string | undefined
  if (conversation.projectId) {
    const db = await getDb()
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(conversation.projectId),
    })
    projectTitle = project?.title
  }

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
          <div className="max-w-4xl mx-auto">
            <MessageThread
              conversationId={id}
              currentUserId={session.user.id}
              otherParticipant={{
                id: otherParticipantId,
                name: ngoInfo?.name || "NGO",
                avatar: ngoInfo?.image,
                type: "ngo",
              }}
              messages={messages}
              projectTitle={projectTitle}
              projectId={conversation.projectId}
              backUrl="/volunteer/messages"
            />
          </div>
        </main>
      </div>
    </div>
  )
}
