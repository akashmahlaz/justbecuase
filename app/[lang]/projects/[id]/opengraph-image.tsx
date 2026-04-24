import { ImageResponse } from "next/og"
import { getProject, getNGOById } from "@/lib/actions"

export const alt = "JustBeCause Network - Opportunity"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: { id: string; lang: string } }) {
  let title = "Opportunity"
  let orgName = "JustBeCause Network"
  let location = ""
  let skills: string[] = []

  const isExternal = params.id.startsWith("ext-")

  if (!isExternal) {
    try {
      const project = await getProject(params.id)
      if (project) {
        title = project.title
        location = project.location || ""
        skills = (project.skillsRequired || []).slice(0, 3).map((s: any) => s.subskillId || s.categoryId)

        const ngo = await getNGOById(project.ngoId)
        if (ngo) orgName = ngo.orgName
      }
    } catch {
      // use defaults
    }
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
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#22d3ee",
            }}
          >
            JustBeCause Network
          </div>
        </div>

        <div
          style={{
            fontSize: "48px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
            marginBottom: "24px",
            maxWidth: "900px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            marginBottom: "auto",
          }}
        >
          {orgName}
          {location && ` · ${location}`}
        </div>

        {skills.length > 0 && (
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            {skills.map((skill) => (
              <div
                key={skill}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "rgba(34, 211, 238, 0.15)",
                  color: "#22d3ee",
                  borderRadius: "9999px",
                  fontSize: "18px",
                  fontWeight: 600,
                }}
              >
                {skill}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "60px",
            fontSize: "18px",
            color: "#64748b",
          }}
        >
          justbecausenetwork.com
        </div>
      </div>
    ),
    { ...size }
  )
}
