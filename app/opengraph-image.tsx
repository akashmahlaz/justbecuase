import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "JustBeCause Network - Skills-Based Impact Platform | Connect Skills with Causes"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(34, 211, 238, 0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-50px",
            left: "-50px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "rgba(15, 118, 110, 0.2)",
          }}
        />

        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            marginBottom: "16px",
            letterSpacing: "-1px",
          }}
        >
          JustBeCause Network
        </div>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "#22d3ee",
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          Skills-Based Impact Platform
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.5,
          }}
        >
          Connect your skills with meaningful causes. Join thousands of professionals making an impact worldwide.
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            marginTop: "48px",
            padding: "20px 40px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#22d3ee" }}>1000+</div>
            <div style={{ fontSize: "14px", color: "#94a3b8" }}>Candidates</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#22d3ee" }}>500+</div>
            <div style={{ fontSize: "14px", color: "#94a3b8" }}>NGO Projects</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#22d3ee" }}>6</div>
            <div style={{ fontSize: "14px", color: "#94a3b8" }}>Languages</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
