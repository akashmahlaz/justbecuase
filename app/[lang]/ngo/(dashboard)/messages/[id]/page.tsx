"use client"

import { use } from "react"
import { ChatView } from "@/components/stream/chat-view"

interface Props {
  params: Promise<{ id: string; lang: string }>
}

export default function NGOMessageThreadPage({ params }: Props) {
  const { id } = use(params)
  return <ChatView userType="ngo" activeChannelId={id} />
}
