import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Calendar, User, ArrowRight } from "lucide-react"

const blogPosts = [
  {
    id: "launch-announcement",
    title: "Introducing JustBecause.asia - Skills-Based Volunteering for Asia",
    excerpt: "We're excited to launch JustBecause.asia, a platform connecting skilled professionals with NGOs across Asia that need their expertise.",
    date: "December 6, 2025",
    author: "JustBecause Team",
    category: "Announcement",
    readTime: "3 min read",
  },
  {
    id: "why-skills-based-volunteering",
    title: "Why Skills-Based Volunteering Matters More Than Ever",
    excerpt: "Traditional volunteering is valuable, but skills-based volunteering can multiply an NGO's impact by 10x. Here's why.",
    date: "December 5, 2025",
    author: "Akash Mahlaz",
    category: "Impact",
    readTime: "5 min read",
  },
  {
    id: "getting-started-ngos",
    title: "Getting Started: A Guide for NGOs",
    excerpt: "Learn how to post your first project, attract the right volunteers, and maximize the value of skills-based partnerships.",
    date: "December 4, 2025",
    author: "JustBecause Team",
    category: "Guide",
    readTime: "7 min read",
  },
]

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 md:px-6 py-12">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Blog
            </h1>
            <p className="text-xl text-muted-foreground">
              Stories, insights, and updates from the JustBecause.asia community
            </p>
          </div>

          {/* Blog Posts Grid */}
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary">{post.category}</Badge>
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
              </Link>
            ))}
          </div>

          {/* Coming Soon */}
          <div className="max-w-3xl mx-auto mt-16 text-center">
            <Card className="bg-muted/30">
              <CardContent className="py-12">
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  More Content Coming Soon
                </h2>
                <p className="text-muted-foreground mb-6">
                  We're working on publishing more stories, guides, and insights. Subscribe to stay updated.
                </p>
                <Link 
                  href="/auth/signup" 
                  className="inline-flex items-center text-primary hover:underline font-medium"
                >
                  Join Our Community
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
