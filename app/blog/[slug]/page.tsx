import { Navbar } from "@/components/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin } from "lucide-react"
import { notFound } from "next/navigation"

// Blog posts content
const blogPosts: Record<string, {
  title: string
  excerpt: string
  date: string
  author: string
  category: string
  readTime: string
  content: string
}> = {
  "launch-announcement": {
    title: "Introducing JustBecause.asia - Skills-Based Volunteering for Asia",
    excerpt: "We're excited to launch JustBecause.asia, a platform connecting skilled professionals with NGOs across Asia that need their expertise.",
    date: "December 6, 2025",
    author: "JustBecause Team",
    category: "Announcement",
    readTime: "3 min read",
    content: `
## A New Era of Meaningful Volunteering

Today marks the beginning of something special. After months of development and countless conversations with NGOs and volunteers across Asia, we're thrilled to officially launch JustBecause.asia.

### The Problem We're Solving

NGOs across Asia are doing incredible work - from environmental conservation to education, healthcare to community development. But many of them lack access to specialized skills they need to maximize their impact:

- **Marketing expertise** to spread their message further
- **Technology skills** to build better systems
- **Financial acumen** to manage resources effectively
- **Design capabilities** to create compelling content

Meanwhile, millions of skilled professionals want to give back but don't know how to make their expertise count.

### Our Solution

JustBecause.asia bridges this gap by creating a marketplace where:

1. **NGOs can post specific projects** describing exactly what skills they need
2. **Professionals can browse opportunities** that match their expertise
3. **Smart matching algorithms** connect the right people with the right projects
4. **Built-in communication tools** make collaboration seamless

### What Makes Us Different

Unlike traditional volunteering platforms, we focus exclusively on **skills-based contributions**. This means:

- Higher impact per volunteer hour
- More fulfilling experience for volunteers
- Sustainable support for NGOs
- Measurable outcomes for everyone

### Join Us

Whether you're an NGO looking for skilled support or a professional wanting to make a difference, we invite you to join our community.

Together, we can create lasting change across Asia - one project at a time.

---

*Ready to get started? [Sign up today](/auth/signup) and be part of the change.*
    `,
  },
  "why-skills-based-volunteering": {
    title: "Why Skills-Based Volunteering Matters More Than Ever",
    excerpt: "Traditional volunteering is valuable, but skills-based volunteering can multiply an NGO's impact by 10x. Here's why.",
    date: "December 5, 2025",
    author: "Akash Mahlaz",
    category: "Impact",
    readTime: "5 min read",
    content: `
## The Multiplier Effect

When a professional marketer volunteers 10 hours to develop a fundraising strategy for an NGO, the impact can be worth thousands of dollars in revenue generated over years. That's the power of skills-based volunteering.

### The Numbers Don't Lie

Studies have shown that:

- **Skills-based volunteers** contribute an average of **$195 per hour** in value
- Traditional volunteers contribute approximately **$29 per hour**
- That's a **6.7x multiplier** on impact

### Beyond the Numbers

But it's not just about money. Skills-based volunteering creates:

#### 1. Sustainable Solutions

When you teach an NGO how to run their own social media campaigns, you're not just solving today's problem - you're building capability for years to come.

#### 2. Professional Development

Volunteers gain real-world experience in new contexts. A corporate lawyer helping with nonprofit governance learns about social impact. A tech manager building a database for a charity learns about resource constraints.

#### 3. Deeper Engagement

Skills-based volunteers report higher satisfaction because they see the direct impact of their specific expertise. It's the difference between "I packed boxes" and "I designed a system that will help them serve 10,000 more families."

### The Asia Opportunity

Asia is home to:
- Over 3 million registered NGOs
- The world's fastest-growing pool of skilled professionals
- Unprecedented digital connectivity

Yet the gap between NGO needs and available skilled support remains massive. That's why we built JustBecause.asia.

### Getting Started

If you've ever thought "I wish I could use my skills for good," now's your chance. Browse our open projects and find one that matches your expertise.

The world needs what you know. Let's put it to work.

---

*Browse [open opportunities](/projects) and make your skills count.*
    `,
  },
  "getting-started-ngos": {
    title: "Getting Started: A Guide for NGOs",
    excerpt: "Learn how to post your first project, attract the right volunteers, and maximize the value of skills-based partnerships.",
    date: "December 4, 2025",
    author: "JustBecause Team",
    category: "Guide",
    readTime: "7 min read",
    content: `
## Welcome to JustBecause.asia

This guide will help you get the most out of our platform and connect with skilled volunteers who can help your organization grow.

### Step 1: Complete Your Profile

Your organization profile is often the first thing volunteers see. Make it count:

- **Add a compelling logo** - First impressions matter
- **Write a clear mission statement** - What change are you trying to create?
- **List your focus areas** - Help volunteers find you
- **Add verification documents** - Verified NGOs get 3x more applications

### Step 2: Post Effective Projects

Great project posts attract great volunteers. Here's how:

#### Be Specific About Scope

❌ "We need help with marketing"

✅ "We need someone to create a 3-month social media content calendar with 30 posts for Facebook and Instagram, targeting urban millennials interested in environmental causes."

#### Define Clear Deliverables

- What exactly will the volunteer produce?
- What format should it be in?
- When do you need it?

#### Estimate Time Honestly

Underestimating discourages volunteers who can't commit enough hours. Overestimating scares them away. Be realistic.

### Step 3: Review Applications Thoughtfully

When applications come in:

1. **Review portfolios** - Past work predicts future quality
2. **Check availability** - Does their schedule match your timeline?
3. **Look for passion** - Volunteers who connect with your mission deliver better work

### Step 4: Communicate Effectively

Once you've matched:

- **Set clear expectations** upfront
- **Provide context** - Help them understand your organization
- **Be responsive** - Volunteers are giving their free time
- **Give feedback** - Both during and after the project

### Step 5: Complete the Loop

After a project ends:

- **Mark it complete** on the platform
- **Leave a review** for the volunteer
- **Stay in touch** - Great volunteers often return

### Pro Tips

1. **Start small** - Your first project should be a quick win to build confidence
2. **Batch similar projects** - If you need multiple skills, post them together
3. **Be flexible on remote** - Remote work opens your project to volunteers worldwide
4. **Unlock profiles strategically** - Use profile unlocks for critical, high-stakes projects

### Need Help?

Our support team is here to help you succeed. Reach out anytime through the Help section in your dashboard.

---

*Ready to post your first project? [Create one now](/ngo/post-project).*
    `,
  },
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = blogPosts[slug]

  if (!post) {
    notFound()
  }

  // Simple markdown-like processing for headers and lists
  const processContent = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-foreground">{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-xl font-semibold mt-6 mb-3 text-foreground">{line.slice(4)}</h3>
        }
        if (line.startsWith('#### ')) {
          return <h4 key={i} className="text-lg font-semibold mt-4 mb-2 text-foreground">{line.slice(5)}</h4>
        }
        if (line.startsWith('- **')) {
          const match = line.match(/- \*\*(.+?)\*\*(.*)/)
          if (match) {
            return (
              <li key={i} className="ml-6 mb-2 text-muted-foreground">
                <strong className="text-foreground">{match[1]}</strong>{match[2]}
              </li>
            )
          }
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-6 mb-2 text-muted-foreground">{line.slice(2)}</li>
        }
        if (line.match(/^\d+\. \*\*/)) {
          const match = line.match(/^\d+\. \*\*(.+?)\*\*(.*)/)
          if (match) {
            return (
              <li key={i} className="ml-6 mb-2 text-muted-foreground list-decimal">
                <strong className="text-foreground">{match[1]}</strong>{match[2]}
              </li>
            )
          }
        }
        if (line.match(/^\d+\. /)) {
          return <li key={i} className="ml-6 mb-2 text-muted-foreground list-decimal">{line.replace(/^\d+\. /, '')}</li>
        }
        if (line.startsWith('❌ ') || line.startsWith('✅ ')) {
          return <p key={i} className="ml-4 mb-2 font-mono text-sm bg-muted p-2 rounded">{line}</p>
        }
        if (line.startsWith('---')) {
          return <hr key={i} className="my-8 border-border" />
        }
        if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
          // Italic text with links
          const linkMatch = line.match(/\[(.+?)\]\((.+?)\)/)
          if (linkMatch) {
            const before = line.slice(1, line.indexOf('['))
            const after = line.slice(line.indexOf(')') + 1, -1)
            return (
              <p key={i} className="mt-6 italic text-muted-foreground">
                {before}
                <Link href={linkMatch[2]} className="text-primary hover:underline">{linkMatch[1]}</Link>
                {after}
              </p>
            )
          }
          return <p key={i} className="mt-4 italic text-muted-foreground">{line.slice(1, -1)}</p>
        }
        if (line.trim() === '') {
          return null
        }
        // Check for inline links
        const linkMatch = line.match(/\[(.+?)\]\((.+?)\)/)
        if (linkMatch) {
          const parts = line.split(/\[.+?\]\(.+?\)/)
          return (
            <p key={i} className="mb-4 text-muted-foreground leading-relaxed">
              {parts[0]}
              <Link href={linkMatch[2]} className="text-primary hover:underline">{linkMatch[1]}</Link>
              {parts[1] || ''}
            </p>
          )
        }
        return <p key={i} className="mb-4 text-muted-foreground leading-relaxed">{line}</p>
      })
      .filter(Boolean)
  }

  const shareUrl = `https://justbecause.asia/blog/${slug}`
  const shareText = encodeURIComponent(post.title)

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <article className="container mx-auto px-4 md:px-6 py-12">
          {/* Back Button */}
          <div className="max-w-3xl mx-auto mb-8">
            <Link href="/blog">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
              </Button>
            </Link>
          </div>

          {/* Header */}
          <header className="max-w-3xl mx-auto mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">{post.category}</Badge>
              <span className="text-sm text-muted-foreground">{post.readTime}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {post.title}
            </h1>
            <div className="flex items-center justify-between">
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
              {/* Share Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">Share:</span>
                <a
                  href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="max-w-3xl mx-auto prose prose-lg">
            {processContent(post.content)}
          </div>

          {/* CTA */}
          <div className="max-w-3xl mx-auto mt-16">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-8 text-center">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Ready to Make an Impact?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Join thousands of professionals using their skills to create change across Asia.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link href="/projects">
                    <Button variant="outline">Browse Projects</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button>Join Now</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </article>
      </div>
    </>
  )
}
