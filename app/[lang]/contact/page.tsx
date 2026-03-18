"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Mail, MapPin, Phone, Loader2, CheckCircle, MessageSquare, Clock, ArrowRight, Send } from "lucide-react"
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
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), message: message.trim(), source }),
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
        {/* Hero Section */}
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
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {source === "pricing_contact_sales" ? (c.salesTitle || "Contact Sales") : (c.title || "Get in Touch")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              {source === "pricing_contact_sales"
                ? (c.salesSubtitle || "Tell us about your organization and we'll create a custom plan for you.")
                : (c.subtitle || "Have questions about our platform? We'd love to hear from you and help connect skills with purpose.")}
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{c.responseTime || "We typically respond within 24 hours"}</span>
            </div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{c.emailUs || "Email Us"}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {c.emailUsDesc || "For general inquiries and support."}
                  </p>
                  <a href="mailto:partner@justbecausenetwork.com" className="text-primary hover:underline font-medium text-sm">
                    partner@justbecausenetwork.com
                  </a>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                    <MapPin className="h-7 w-7 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{c.visitUs || "Visit Us"}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {c.visitUsDesc || "Our office location."}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Mysore, Karnataka<br />India
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-success-light flex items-center justify-center mx-auto mb-4 group-hover:bg-success/20 transition-colors">
                    <Phone className="h-7 w-7 text-success" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{c.callUs || "Call Us"}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {c.callUsHours || "Mon-Fri from 9am to 6pm IST."}
                  </p>
                  <a href="tel:+917814002784" className="text-primary hover:underline font-medium text-sm">
                    +91 7814002784
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 border-border/50 shadow-lg">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{c.sendAMessage || "Send a Message"}</CardTitle>
                  <CardDescription className="text-base">
                    {c.formDesc || "Fill out the form below and our team will get back to you."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-8 pt-4 sm:px-8">
                  {isSubmitted ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-20 h-20 rounded-full bg-success-light flex items-center justify-center mx-auto">
                        <CheckCircle className="h-10 w-10 text-success" />
                      </div>
                      <h3 className="text-2xl font-semibold">{c.thankYou || "Thank You!"}</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {c.weWillGetBack || "We've received your message and will get back to you within 24 hours."}
                      </p>
                      <Button variant="outline" onClick={() => { setIsSubmitted(false); setFirstName(""); setLastName(""); setEmail(""); setMessage("") }}>
                        {c.sendAnother || "Send Another Message"}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="first-name" className="text-sm font-medium">{c.firstName || "First name"}</label>
                          <Input id="first-name" placeholder="John" required maxLength={100} value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isSubmitting} className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="last-name" className="text-sm font-medium">{c.lastName || "Last name"}</label>
                          <Input id="last-name" placeholder="Doe" required maxLength={100} value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isSubmitting} className="h-11" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">{c.emailLabel || "Email"}</label>
                        <Input id="email" placeholder="john@example.com" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-medium">{c.messageLabel || "Message"}</label>
                        <Textarea id="message" placeholder={c.messagePlaceholder || "How can we help you?"} className="min-h-38 resize-none" required maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} disabled={isSubmitting} />
                      </div>
                      <Button className="w-full h-11" type="submit" disabled={isSubmitting} size="lg">
                        {isSubmitting ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{c.sending || "Sending..."}</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" />{c.sendButton || "Send Message"}</>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">{c.ctaHeading || "Ready to Make an Impact?"}</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
              {c.ctaPara || "Whether you're a skilled professional or an NGO, join our platform and start connecting skills with purpose."}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary">
                <LocaleLink href="/auth/signup">
                  {c.ctaGetStarted || "Get Started"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </LocaleLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LocaleLink href="/projects">{c.ctaBrowse || "Browse Opportunities"}</LocaleLink>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
