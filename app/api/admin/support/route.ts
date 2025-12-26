import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import client from "@/lib/db"

const DB_NAME = "justbecause"
const COLLECTION_NAME = "support_tickets"

interface SupportTicket {
  _id?: string
  subject: string
  description: string
  status: "open" | "in-progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  category: "technical" | "payment" | "account" | "general" | "report"
  userId: string
  userName: string
  userEmail: string
  userType: "volunteer" | "ngo"
  createdAt: string
  updatedAt: string
  responses: {
    id: string
    message: string
    isAdmin: boolean
    createdAt: string
  }[]
}

// GET - Get all support tickets
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    await client.connect()
    const db = client.db(DB_NAME)
    const adminCollection = db.collection("admins")
    const admin = await adminCollection.findOne({ email: session.user.email })
    
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const collection = db.collection<SupportTicket>(COLLECTION_NAME)
    const tickets = await collection.find({}).sort({ createdAt: -1 }).toArray()
    
    // Convert _id to string id
    const formattedTickets = tickets.map(ticket => ({
      ...ticket,
      id: ticket._id?.toString(),
      _id: undefined
    }))

    return NextResponse.json({ tickets: formattedTickets })
  } catch (error) {
    console.error("Error fetching support tickets:", error)
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 })
  }
}

// POST - Create new ticket or add response
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    
    await client.connect()
    const db = client.db(DB_NAME)
    const collection = db.collection<SupportTicket>(COLLECTION_NAME)
    
    // Check if adding a response to existing ticket (admin only)
    if (body.ticketId && body.response) {
      const adminCollection = db.collection("admins")
      const admin = await adminCollection.findOne({ email: session.user.email })
      
      if (!admin) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }

      const { ObjectId } = await import("mongodb")
      const result = await collection.updateOne(
        { _id: new ObjectId(body.ticketId) },
        {
          $push: {
            responses: {
              id: `r${Date.now()}`,
              message: body.response,
              isAdmin: true,
              createdAt: new Date().toISOString()
            }
          } as any,
          $set: {
            status: body.newStatus || "in-progress",
            updatedAt: new Date().toISOString()
          }
        }
      )

      return NextResponse.json({ success: true, modifiedCount: result.modifiedCount })
    }

    // Create new ticket (any authenticated user)
    const newTicket: Omit<SupportTicket, "_id"> = {
      subject: body.subject,
      description: body.description,
      status: "open",
      priority: body.priority || "medium",
      category: body.category || "general",
      userId: session.user.id,
      userName: session.user.name || "Unknown",
      userEmail: session.user.email || "",
      userType: body.userType || "volunteer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    }

    const result = await collection.insertOne(newTicket as any)
    
    return NextResponse.json({ 
      success: true, 
      ticketId: result.insertedId.toString() 
    })
  } catch (error) {
    console.error("Error creating support ticket:", error)
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 })
  }
}

// PATCH - Update ticket status
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await client.connect()
    const db = client.db(DB_NAME)
    
    // Check if user is admin
    const adminCollection = db.collection("admins")
    const admin = await adminCollection.findOne({ email: session.user.email })
    
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await req.json()
    const { ticketId, status } = body

    if (!ticketId || !status) {
      return NextResponse.json({ error: "Missing ticketId or status" }, { status: 400 })
    }

    const { ObjectId } = await import("mongodb")
    const collection = db.collection<SupportTicket>(COLLECTION_NAME)
    
    const result = await collection.updateOne(
      { _id: new ObjectId(ticketId) },
      {
        $set: {
          status,
          updatedAt: new Date().toISOString()
        }
      }
    )

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount })
  } catch (error) {
    console.error("Error updating support ticket:", error)
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
  }
}
