import { NextResponse } from "next/server"
import { browseProjects } from "@/lib/actions"

export async function GET() {
  try {
    const projects = await browseProjects()
    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ projects: [] }, { status: 500 })
  }
}
