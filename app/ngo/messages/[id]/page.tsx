import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getConversation, getConversationMessages, getNGOProfile } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NGOSidebar } from "@/components/dashboard/ngo-sidebar"
import { MessageThread } from "@/components/messages/message-thread"
import { getUserInfo } from "@/lib/user-utils"
import { getDb } from "@/lib/database"
import { ObjectId } from "mongodb"

interface Props {
  params: Promise<{ id: string }>
}

export default async function NGOMessageThreadPage({ params }: Props) {
  const { id } = await params
  
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const ngoProfile = await getNGOProfile()
  const conversation = await getConversation(id)

  if (!conversation) {
    notFound()
  }

  // Get messages
  const messages = await getConversationMessages(id)

  // Find the other participant (Volunteer)
  const otherParticipantId = conversation.participants.find(
    (p: string) => p !== session.user.id
  )

  if (!otherParticipantId) {
    notFound()
  }

  // Get volunteer info using centralized utility
  const volunteerInfo = await getUserInfo(otherParticipantId)

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
        userType="ngo"
        userName={ngoProfile?.orgName || ngoProfile?.organizationName || session.user.name || "NGO"}
        userAvatar={ngoProfile?.logo || session.user.image || undefined}
      />

      <div className="flex">
        <NGOSidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <MessageThread
              conversationId={id}
              currentUserId={session.user.id}
              otherParticipant={{
                id: otherParticipantId,
                name: volunteerInfo?.name || "Volunteer",
                avatar: volunteerInfo?.image,
                type: "volunteer",
              }}
              messages={messages}
              projectTitle={projectTitle}
              projectId={conversation.projectId}
              backUrl="/ngo/messages"
            />
          </div>
        </main>
      </div>
    </div>
  )
}
