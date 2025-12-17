"use client"

import type React from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { NotificationListener } from "@/components/notifications/notification-listener"

function NGOLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  return (
    <>
      {user?.id && <NotificationListener userId={user.id} />}
      {children}
    </>
  )
}

export default function NGOLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <NGOLayoutInner>{children}</NGOLayoutInner>
    </AuthProvider>
  )
}
