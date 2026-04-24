import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LocaleLink from "@/components/locale-link"
import { Calendar, User, ArrowRight, BookOpen } from "lucide-react"
import { getPublishedBlogPosts } from "@/lib/actions"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"

// Fallback posts shown when no DB posts exist
const fallbackPosts = [
  {
    slug: "launch-announcement",
    title: "Introducing JustBeCause Network - Skills-Based Volunteering",
    excerpt: "We're excited to launch JustBeCause Network, a platform connecting skilled professionals with NGOs that need their expertise.",
    date: "December 6, 2025",
    author: "JustBeCause Team",
    tags: ["Announcement"],
    readTime: "3 min read",
  },
  {
    slug: "why-skills-based-volunteering",
    title: "Why Skills-Based Volunteering Matters More Than Ever",
    excerpt: "Traditional volunteering is valuable, but skills-based volunteering can multiply an NGO's impact by 10x. Here's why.",
    date: "December 5, 2025",
    author: "Akash Mahlaz",
    tags: ["Impact"],
    readTime: "5 min read",
  },
  {
    slug: "getting-started-ngos",
    title: "Getting Started: A Guide for NGOs",
    excerpt: "Learn how to post your first job, attract the right volunteers, and maximize the value of skills-based partnerships.",
    date: "December 4, 2025",
    author: "JustBeCause Team",
    tags: ["Guide"],
    readTime: "7 min read",
  },
]

export const revalidate = 300

export const metadata: Metadata = {
  title: "Blog - Insights on Skills-Based Volunteering & Social Impact",
  description: "Read insights, guides, and stories about skills-based volunteering, social impact, NGO success stories, and how to make a difference with your professional expertise.",
  keywords: ["volunteering blog", "social impact stories", "NGO guides", "skills-based volunteering tips", "nonprofit insights"],
  openGraph: {
    title: "Blog | JustBeCause Network",
    description: "Insights, guides, and stories about skills-based volunteering and social impact.",
  },
}

export default async function BlogPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale)
  const b = (dict as any).blog || {}
  const result = await getPublishedBlogPosts(50)
  const dbPosts = result.success ? (result.data || []) : []

  // Merge DB posts with fallbacks (DB posts take priority)
  const posts = dbPosts.length > 0
    ? dbPosts.map((p: any) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt || p.content?.slice(0, 150) + "...",
        date: new Date(p.publishedAt || p.createdAt).toLocaleDateString("en-IN", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        author: p.authorName || "JustBeCause Team",
        tags: p.tags || [],
        readTime: `${Math.max(1, Math.ceil((p.content?.length || 0) / 1500))} min read`,
        viewCount: p.viewCount || 0,
      }))
    : fallbackPosts

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{b.badge || "Stories & Insights"}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {b.title || "Blog"}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {b.subtitle || "Stories, insights, and updates from the JustBeCause Network community"}
            </p>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any) => (
              <LocaleLink key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-3">
                      {post.tags?.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                      <span className="text-sm text-muted-foreground">{post.readTime}</span>
                    </div>
                    <CardTitle className="text-xl hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {post.author}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </LocaleLink>
            ))}
            </div>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <Card className="border-2 border-primary/20">
                <CardContent className="py-12">
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  {b.comingSoon || "More Content Coming Soon"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {b.comingSoonDesc || "We're working on publishing more stories, guides, and insights. Subscribe to stay updated."}
                </p>
                <LocaleLink 
                  href="/auth/signup" 
                  className="inline-flex items-center text-primary hover:underline font-medium"
                >
                  {b.joinCommunity || "Join Our Community"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </LocaleLink>
              </CardContent>
            </Card>
          </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}