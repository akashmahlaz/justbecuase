import { ImageResponse } from "next/og"
import { getNGOById } from "@/lib/actions"

export const alt = "NGO Profile - JustBeCause Network"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: { id: string; lang: string } }) {
  let name = "NGO Profile"
  let description = ""
  let verified = false

  try {
    const ngo = await getNGOById(params.id)
    if (ngo) {
      name = ngo.orgName
      description = (ngo.description || "").slice(0, 120)
      verified = !!ngo.isVerified
    }
  } catch {
    // use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f172a",
          backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#22d3ee" }}>
            JustBeCause Network
          </div>
          <div style={{ fontSize: "18px", color: "#64748b" }}>· NGO Profile</div>
        </div>

        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {name}
          {verified && (
            <div
              style={{
                fontSize: "20px",
                background: "#22d3ee",
                color: "#0f172a",
                padding: "4px 12px",
                borderRadius: "20px",
                fontWeight: 600,
              }}
            >
              ✓ Verified
            </div>
          )}
        </div>

        {description && (
          <div style={{ fontSize: "22px", color: "#94a3b8", lineHeight: 1.5, maxWidth: "800px" }}>
            {description}
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
