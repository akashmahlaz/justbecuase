"use client"

import type React from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { NotificationListener } from "@/components/notifications/notification-listener"

function VolunteerLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  return (
    <>
      {user?.id && <NotificationListener userId={user.id} userType="volunteer" />}
      {children}
    </>
  )
}

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <VolunteerLayoutInner>{children}</VolunteerLayoutInner>
    </AuthProvider>
  )
}
