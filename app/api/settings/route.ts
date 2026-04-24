import { NextResponse } from "next/server"
import { adminSettingsDb } from "@/lib/database"

// Force dynamic — never cache this route so admin changes take effect immediately
export const dynamic = "force-dynamic"

// GET /api/settings - Get public platform settings (no auth required)
export async function GET() {
  try {
    const settings = await adminSettingsDb.get()
    
    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        data: {
          platformName: "JustBeCause Network",
          platformDescription: "Connecting Skills with Purpose",
          supportEmail: "support@justbecausenetwork.com",
          currency: "INR",
          volunteerFreeApplicationsPerMonth: 3,
          volunteerProPrice: 999, // Production price in INR
          volunteerProYearlyPrice: 9990, // ~10 months price for yearly
          volunteerProFeatures: [
            "Unlimited job applications",
            "Featured profile badge",
            "Priority in search results",
            "Direct message NGOs",
            "Early access to opportunities",
            "Profile analytics",
            "Certificate downloads",
          ],
          ngoFreeProjectsPerMonth: 3,
          ngoFreeProfileUnlocksPerMonth: 0,
          ngoProPrice: 2999, // Production price in INR
          ngoProYearlyPrice: 29990, // ~10 months price for yearly
          ngoProFeatures: [
            "Unlimited projects",
            "Unlimited profile unlocks",
            "Advanced AI-powered matching",
            "Priority support",
            "Project analytics & reports",
            "Featured NGO badge",
            "Bulk candidate outreach",
          ],
          enablePayments: true,
          enableMessaging: true,
          metaTitle: "JustBeCause Network - Connect NGOs with Candidates",
          metaDescription: "Platform connecting NGOs with skilled candidates for social impact",
        }
      })
    }
    
    // Return only public settings (exclude sensitive data)
    // Coerce prices to numbers to prevent string issues from MongoDB
    return NextResponse.json({
      success: true,
      data: {
        platformName: settings.platformName,
        platformDescription: settings.platformDescription,
        supportEmail: settings.supportEmail,
        platformLogo: settings.platformLogo,
        currency: settings.currency,
        volunteerFreeApplicationsPerMonth: Number(settings.volunteerFreeApplicationsPerMonth) || 3,
        volunteerProPrice: Number(settings.volunteerProPrice) || 999,
        volunteerProYearlyPrice: Number(settings.volunteerProYearlyPrice) || Math.round((Number(settings.volunteerProPrice) || 999) * 10),
        volunteerProFeatures: settings.volunteerProFeatures || [],
        ngoFreeProjectsPerMonth: Number(settings.ngoFreeProjectsPerMonth) || 3,
        ngoFreeProfileUnlocksPerMonth: Number(settings.ngoFreeProfileUnlocksPerMonth) || 0,
        ngoProPrice: Number(settings.ngoProPrice) || 2999,
        ngoProYearlyPrice: Number(settings.ngoProYearlyPrice) || Math.round((Number(settings.ngoProPrice) || 2999) * 10),
        ngoProFeatures: settings.ngoProFeatures || [],
        enablePayments: settings.enablePayments,
        enableMessaging: settings.enableMessaging,
        metaTitle: settings.metaTitle,
        metaDescription: settings.metaDescription,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        socialLinks: settings.socialLinks,
      }
    })
  } catch (error) {
    console.error("Failed to fetch platform settings:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 })
  }
}
