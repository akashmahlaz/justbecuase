import { NextRequest, NextResponse } from "next/server"
import { searchAnalyticsDb } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchEventId, resultId, resultType, position } = body

    if (!searchEventId || !resultId || !resultType || typeof position !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await searchAnalyticsDb.trackClick(searchEventId, resultId, resultType, position)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Search Click Track] Error:", error)
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
  }
}
