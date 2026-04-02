"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Mail, MapPin, Loader2, CheckCircle, MessageSquare, Clock, ArrowRight, Send } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"
import { toast } from "sonner"
import LocaleLink from "@/components/locale-link"

export default function ContactPage() {
  return (
    <Suspense>
      <ContactPageContent />
    </Suspense>
  )
}

function ContactPageContent() {
  const dict = useDictionary()
  const c = (dict as any).contact || {}
  const searchParams = useSearchParams()
  const source = searchParams.get("source") === "pricing" ? "pricing_contact_sales" : "contact_page"

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState(
    source === "pricing_contact_sales"
      ? (c.salesDefaultMessage || "I'm interested in a custom enterprise plan for my organization.")
      : ""
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !message.trim()) {
      toast.error(c.allFieldsRequired || "All fields are required")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(c.invalidEmail || "Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          message: message.trim(),
          source
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to send message")
      }

      setIsSubmitted(true)
      toast.success(c.messageSent || "Message sent successfully!")
    } catch (err: any) {
      toast.error(err.message || c.sendFailed || "Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {source === "pricing_contact_sales"
                  ? (c.salesBadge || "Enterprise Solutions")
                  : (c.badge || "We're Here to Help")}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {source === "pricing_contact_sales"
                ? (c.salesTitle || "Contact Sales")
                : (c.title || "Get in Touch")}
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              {source === "pricing_contact_sales"
                ? (c.salesSubtitle || "Tell us about your organization and we'll create a custom plan for you.")
                : (c.subtitle || "Have questions? We'd love to help.")}
            </p>

            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{c.responseTime || "We typically respond within 24 hours"}</span>
            </div>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">

              {/* Email */}
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{c.emailUs || "Email Us"}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {c.emailUsDesc || "For general inquiries and support."}
                  </p>
                  <a href="mailto:partnerships@justbecausenetwork.com" className="text-primary hover:underline text-sm">
                    partnerships@justbecausenetwork.com
                  </a>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-7 w-7 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-1">{c.visitUs || "Visit Us"}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {c.visitUsDesc || "Our office location."}
                  </p>
                  <p className="text-sm font-medium">
                    Singapore
                  </p>
                </CardContent>
              </Card>

            </div>
          </div>
        </section>

        {/* Form */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle>{c.sendAMessage || "Send a Message"}</CardTitle>
                  <CardDescription>
                    {c.formDesc || "Fill out the form and we’ll get back to you."}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {isSubmitted ? (
                    <div className="text-center py-10">
                      <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
                      <p className="mt-4">{c.thankYou || "Thank you! We'll respond soon."}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      <Textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />

                      <Button className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send Message
                      </Button>
                    </form>
                  )}
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