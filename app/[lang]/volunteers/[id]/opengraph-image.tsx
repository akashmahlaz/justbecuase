import { ImageResponse } from "next/og"
import { getVolunteerProfileView } from "@/lib/actions"

export const runtime = "edge"
export const alt = "Impact Agent Profile - JustBeCause Network"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: { id: string; lang: string } }) {
  let name = "Impact Agent"
  let bio = ""
  let skills: string[] = []

  try {
    const volunteer = await getVolunteerProfileView(params.id)
    if (volunteer) {
      name = volunteer.name || "Impact Agent"
      bio = (volunteer.bio || "").slice(0, 120)
      skills = (volunteer.skills || [])
        .slice(0, 4)
        .map((s: any) => s.subskillId || s.categoryId || "")
        .filter(Boolean)
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
          <div style={{ fontSize: "18px", color: "#64748b" }}>· Impact Agent</div>
        </div>

        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
            marginBottom: "20px",
          }}
        >
          {name}
        </div>

        {bio && (
          <div style={{ fontSize: "22px", color: "#94a3b8", lineHeight: 1.5, maxWidth: "800px", marginBottom: "auto" }}>
            {bio}
          </div>
        )}

        {skills.length > 0 && (
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            {skills.map((skill) => (
              <div
                key={skill}
                style={{
                  padding: "8px 20px",
                  borderRadius: "20px",
                  background: "rgba(34, 211, 238, 0.15)",
                  color: "#22d3ee",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {skill}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
