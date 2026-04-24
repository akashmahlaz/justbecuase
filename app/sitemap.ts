import type { MetadataRoute } from "next"
import { i18n } from "@/lib/i18n-config"
import { projectsDb, ngoProfilesDb, blogPostsDb, volunteerProfilesDb } from "@/lib/database"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = i18n.locales

  // Static pages with their priorities
  const staticPages = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/projects", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/volunteers", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/for-ngos", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/for-volunteers", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/pricing", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/changelog", priority: 0.5, changeFrequency: "weekly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  ]

  // Generate static page entries with locale alternates
  const staticEntries: MetadataRoute.Sitemap = staticPages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${BASE_URL}/${l}${page.path}`])
        ),
      },
    }))
  )

  // Dynamic project pages
  let projectEntries: MetadataRoute.Sitemap = []
  try {
    const projects = await projectsDb.findActive({}, { limit: 5000, sort: { createdAt: -1 } as any })
    projectEntries = projects.flatMap((project: any) =>
      locales.map((locale) => ({
        url: `${BASE_URL}/${locale}/projects/${project._id?.toString() || project.id}`,
        lastModified: project.updatedAt ? new Date(project.updatedAt) : new Date(project.createdAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}/projects/${project._id?.toString() || project.id}`])
          ),
        },
      }))
    )
  } catch (e) {
    console.error("[sitemap] Failed to fetch projects:", e)
  }

  // Dynamic Enterprise pages
  let ngoEntries: MetadataRoute.Sitemap = []
  try {
    const ngos = await ngoProfilesDb.findMany({ isActive: true }, { limit: 5000 } as any)
    ngoEntries = ngos.flatMap((ngo: any) =>
      locales.map((locale) => ({
        url: `${BASE_URL}/${locale}/ngos/${ngo.userId || ngo._id?.toString()}`,
        lastModified: ngo.updatedAt ? new Date(ngo.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}/ngos/${ngo.userId || ngo._id?.toString()}`])
          ),
        },
      }))
    )
  } catch (e) {
    console.error("[sitemap] Failed to fetch Enterprises:", e)
  }

  // Dynamic blog pages
  let blogEntries: MetadataRoute.Sitemap = []
  try {
    const posts = await blogPostsDb.findPublished(100, 0)
    blogEntries = posts.flatMap((post: any) =>
      locales.map((locale) => ({
        url: `${BASE_URL}/${locale}/blog/${post.slug}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.createdAt),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}/blog/${post.slug}`])
          ),
        },
      }))
    )
  } catch (e) {
    console.error("[sitemap] Failed to fetch blog posts:", e)
  }

  // Dynamic volunteer profile pages
  let volunteerEntries: MetadataRoute.Sitemap = []
  try {
    const volunteers = await volunteerProfilesDb.findMany(
      { isActive: true, visibility: "public" },
      { limit: 5000 } as any
    )
    volunteerEntries = volunteers.flatMap((v: any) =>
      locales.map((locale) => ({
        url: `${BASE_URL}/${locale}/volunteers/${v.userId || v._id?.toString()}`,
        lastModified: v.updatedAt ? new Date(v.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}/volunteers/${v.userId || v._id?.toString()}`])
          ),
        },
      }))
    )
  } catch (e) {
    console.error("[sitemap] Failed to fetch volunteers:", e)
  }

  return [...staticEntries, ...projectEntries, ...ngoEntries, ...blogEntries, ...volunteerEntries]
}
