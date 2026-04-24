import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getDb, userIdQuery } from "@/lib/database"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const userId = session.user.id
    const role = session.user.role as string

    // Gather all user data
    const userData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: role,
        createdAt: session.user.createdAt,
      }
    }

    if (role === "volunteer") {
      // Get volunteer profile from user collection (Better Auth stores _id as ObjectId)
      const profile = await db.collection("user").findOne(userIdQuery(userId))
      if (profile) {
        userData.profile = {
          name: profile.name,
          phone: profile.phone,
          location: profile.location,
          city: profile.city,
          country: profile.country,
          bio: profile.bio,
          linkedinUrl: profile.linkedinUrl,
          portfolioUrl: profile.portfolioUrl,
          resumeUrl: profile.resumeUrl,
          skills: profile.skills,
          causes: profile.causes,
          volunteerType: profile.volunteerType,
          workMode: profile.workMode,
          hoursPerWeek: profile.hoursPerWeek,
          availability: profile.availability,
          completedProjects: profile.completedProjects,
          hoursContributed: profile.hoursContributed,
          subscriptionPlan: profile.subscriptionPlan,
          isVerified: profile.isVerified,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }
      }

      // Get applications
      const applications = await db.collection("applications")
        .find({ volunteerId: userId })
        .toArray()
      userData.applications = applications.map((app: any) => ({
        projectId: app.projectId,
        status: app.status,
        coverLetter: app.coverLetter,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      }))

      // Get messages
      const conversations = await db.collection("conversations")
        .find({ participants: userId })
        .toArray()
      const conversationIds = conversations.map((c: any) => c._id?.toString())
      const messages = await db.collection("messages")
        .find({ conversationId: { $in: conversationIds } })
        .toArray()
      userData.messages = messages.map((msg: any) => ({
        content: msg.content,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
      }))

      // Get notifications
      const notifications = await db.collection("notifications")
        .find({ userId })
        .toArray()
      userData.notifications = notifications.map((n: any) => ({
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
      }))

    } else if (role === "ngo") {
      // Get NGO profile from user collection (Better Auth stores _id as ObjectId)
      const profile = await db.collection("user").findOne(userIdQuery(userId))
      if (profile) {
        userData.profile = {
          orgName: profile.orgName,
          registrationNumber: profile.registrationNumber,
          orgType: profile.orgType,
          foundedYear: profile.foundedYear,
          website: profile.website,
          description: profile.description,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          causes: profile.causes,
          contactName: profile.contactName,
          contactEmail: profile.contactEmail,
          contactPhone: profile.contactPhone,
          subscriptionPlan: profile.subscriptionPlan,
          isVerified: profile.isVerified,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }
      }

      // Get projects
      const projects = await db.collection("projects")
        .find({ ngoId: userId })
        .toArray()
      userData.projects = projects.map((p: any) => ({
        title: p.title,
        description: p.description,
        status: p.status,
        skillsRequired: p.skillsRequired,
        causes: p.causes,
        applicantsCount: p.applicantsCount,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))

      // Get unlocked profiles
      const unlocks = await db.collection("profileUnlocks")
        .find({ ngoId: userId })
        .toArray()
      userData.unlockedProfiles = unlocks.map((u: any) => ({
        volunteerId: u.volunteerId,
        unlockedAt: u.unlockedAt,
      }))

      // Get messages
      const conversations = await db.collection("conversations")
        .find({ participants: userId })
        .toArray()
      const conversationIds = conversations.map((c: any) => c._id?.toString())
      const messages = await db.collection("messages")
        .find({ conversationId: { $in: conversationIds } })
        .toArray()
      userData.messages = messages.map((msg: any) => ({
        content: msg.content,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
      }))

      // Get notifications
      const notifications = await db.collection("notifications")
        .find({ userId })
        .toArray()
      userData.notifications = notifications.map((n: any) => ({
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
      }))
    }

    // Return as JSON download
    const jsonString = JSON.stringify(userData, null, 2)
    
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="justbecause-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Failed to export user data:", error)
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
  }
}
