"use client"

import { use } from "react"
import { ChatView } from "@/components/stream/chat-view"

interface Props {
  params: Promise<{ id: string }>
}

export default function VolunteerMessageThreadPage({ params }: Props) {
  const { id } = use(params)
  return <ChatView userType="volunteer" activeChannelId={id} />
}
