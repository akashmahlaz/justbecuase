import { notFound } from "next/navigation"
import LocaleLink from "@/components/locale-link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { getTeamMemberById } from "@/lib/actions"
import { ArrowLeft, Linkedin, Twitter } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TeamMemberPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params

  const result = await getTeamMemberById(id)
  if (!result.success || !result.data) notFound()

  const member = result.data

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <div className="container mx-auto px-4 md:px-6 py-12">
          <LocaleLink href="/about" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to About
          </LocaleLink>

          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-8">
              <img
                src={member.avatar || "/placeholder.svg"}
                alt={member.name}
                className="w-40 h-40 rounded-full object-cover bg-muted shrink-0"
              />
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold text-foreground mb-2">{member.name}</h1>
                <p className="text-lg text-primary mb-4">{member.role}</p>
                <div className="flex justify-center sm:justify-start gap-2">
                  {member.linkedinUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {member.twitterUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={member.twitterUrl} target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-4 w-4 mr-2" />
                        Twitter
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {member.bio.split('\n').map((paragraph, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed text-base mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
