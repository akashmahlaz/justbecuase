import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers as nextHeaders } from "next/headers"
import {
  searchJobs,
  searchCompanies,
  getCreditBalance,
  type JobSearchParams,
  type CompanySearchParams,
} from "@/lib/theirstack"

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await nextHeaders(),
  })
  if (!session?.user || session.user.role !== "admin") {
    return null
  }
  return session.user
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, params } = body as {
      action: "searchJobs" | "searchCompanies" | "creditBalance"
      params?: JobSearchParams | CompanySearchParams
    }

    switch (action) {
      case "searchJobs": {
        const result = await searchJobs(params as JobSearchParams)
        return NextResponse.json(result)
      }
      case "searchCompanies": {
        const result = await searchCompanies(params as CompanySearchParams)
        return NextResponse.json(result)
      }
      case "creditBalance": {
        const result = await getCreditBalance()
        return NextResponse.json(result)
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[TheirStack API]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
