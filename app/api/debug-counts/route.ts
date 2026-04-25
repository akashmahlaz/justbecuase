import { NextResponse } from "next/server"
import { getDb } from "@/lib/database"

export async function GET(req: Request) {
  const db = await getDb()
  const col = db.collection("externalOpportunities")

  const url = new URL(req.url)
  
  // ?fix=reactivate — reactivate future-deadline reliefweb jobs
  if (url.searchParams.get("fix") === "reactivate") {
    const result = await col.updateMany(
      { sourceplatform: "reliefweb-api", isActive: false, deadline: { $gt: new Date() } },
      { $set: { isActive: true, updatedAt: new Date() } }
    )
    return NextResponse.json({ reactivated: result.modifiedCount })
  }

  // ?fix=deactivate-non-remote — mark all non-remote active jobs as inactive
  if (url.searchParams.get("fix") === "deactivate-non-remote") {
    const result = await col.updateMany(
      { isActive: true, workMode: { $ne: "remote" } },
      { $set: { isActive: false, updatedAt: new Date() } }
    )
    return NextResponse.json({ deactivated: result.modifiedCount })
  }

  // ?view=workmode — show workMode breakdown for active jobs
  if (url.searchParams.get("view") === "workmode") {
    const wmBreakdown = await col.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { platform: "$sourceplatform", workMode: "$workMode" }, count: { $sum: 1 } } },
      { $sort: { "_id.platform": 1, "_id.workMode": 1 } },
    ]).toArray()
    return NextResponse.json({
      workModeBreakdown: wmBreakdown.map((r: any) => ({
        platform: r._id.platform,
        workMode: r._id.workMode,
        count: r.count,
      })),
    })
  }

  const breakdown = await col.aggregate([
    { $group: { _id: { platform: "$sourceplatform", active: "$isActive" }, count: { $sum: 1 } } },
    { $sort: { "_id.platform": 1, "_id.active": -1 } },
  ]).toArray()

  const total = await col.countDocuments()

  // Inactive ReliefWeb: split by future vs past deadline
  const now = new Date()
  const inactiveRwFuture = await col.countDocuments({ 
    sourceplatform: "reliefweb-api", isActive: false, deadline: { $gt: now } 
  })
  const inactiveRwPast = await col.countDocuments({ 
    sourceplatform: "reliefweb-api", isActive: false, deadline: { $lte: now } 
  })
  const inactiveRwNoDeadline = await col.countDocuments({ 
    sourceplatform: "reliefweb-api", isActive: false, deadline: { $exists: false } 
  })

  // Inactive Idealist: same
  const inactiveIdFuture = await col.countDocuments({ 
    sourceplatform: "idealist-api", isActive: false, deadline: { $gt: now } 
  })
  const inactiveIdPast = await col.countDocuments({ 
    sourceplatform: "idealist-api", isActive: false, deadline: { $lte: now } 
  })

  // Check latest Idealist update times
  const latestIdealist = await col.find(
    { sourceplatform: "idealist-api" },
    { projection: { updatedAt: 1, _id: 0 } }
  ).sort({ updatedAt: -1 }).limit(1).toArray()

  const idealistTotal = await col.countDocuments({ sourceplatform: "idealist-api" })

  return NextResponse.json({
    breakdown: breakdown.map((r: any) => ({
      platform: r._id.platform,
      active: r._id.active,
      count: r.count,
    })),
    total,
    reliefwebInactive: {
      total: await col.countDocuments({ sourceplatform: "reliefweb-api", isActive: false }),
      futureDeadline: inactiveRwFuture,
      pastDeadline: inactiveRwPast,
      noDeadline: inactiveRwNoDeadline,
    },
    idealistInactive: {
      futureDeadline: inactiveIdFuture,
      pastDeadline: inactiveIdPast,
    },
    idealistTotal,
    latestIdealistUpdate: latestIdealist[0]?.updatedAt,
    now: new Date().toISOString(),
  })
}
