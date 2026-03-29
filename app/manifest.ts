import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JustBeCause Network - Skills-Based Impact Platform",
    short_name: "JustBeCause",
    description:
      "Connect your skills with meaningful causes. Join thousands making an impact worldwide.",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    orientation: "portrait-primary",
    categories: ["social", "nonprofit", "business"],
    icons: [
      {
        src: "/icon-light-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/logo-main.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
