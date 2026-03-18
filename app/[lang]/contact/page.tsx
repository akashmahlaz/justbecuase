"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Mail, MapPin, Phone, Loader2, CheckCircle } from "lucide-react"
import { useDictionary } from "@/components/dictionary-provider"
import { toast } from "sonner"

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
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              {source === "pricing_contact_sales" ? (c.salesTitle || "Contact Sales") : (c.title || "Contact Us")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {source === "pricing_contact_sales"
                ? (c.salesSubtitle || "Tell us about your organization and we'll create a custom plan for you.")
                : (c.subtitle || "Have questions? We'd love to hear from you.")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>{c.sendAMessage || "Send a Message"}</CardTitle>
                <CardDescription>
                  {c.formDesc || "Fill out the form below and our team will get back to you."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8 space-y-4">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <h3 className="text-xl font-semibold">{c.thankYou || "Thank You!"}</h3>
                    <p className="text-muted-foreground">
                      {c.weWillGetBack || "We've received your message and will get back to you within 24 hours."}
                    </p>
                    <Button variant="outline" onClick={() => { setIsSubmitted(false); setFirstName(""); setLastName(""); setEmail(""); setMessage("") }}>
                      {c.sendAnother || "Send Another Message"}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="first-name" className="text-sm font-medium">{c.firstName || "First name"}</label>
                        <Input id="first-name" placeholder="John" required maxLength={100} value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isSubmitting} />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="last-name" className="text-sm font-medium">{c.lastName || "Last name"}</label>
                        <Input id="last-name" placeholder="Doe" required maxLength={100} value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isSubmitting} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">{c.emailLabel || "Email"}</label>
                      <Input id="email" placeholder="john@example.com" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">{c.messageLabel || "Message"}</label>
                      <Textarea id="message" placeholder={c.messagePlaceholder || "How can we help you?"} className="min-h-[120px]" required maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <Button className="w-full" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{c.sending || "Sending..."}</>
                      ) : (
                        c.sendButton || "Send Message"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <Mail className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">{c.emailUs || "Email Us"}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {c.emailUsDesc || "For general inquiries and support."}
                    </p>
                    <a href="mailto:hello@justbecausenetwork.com" className="text-primary hover:underline">
                      hello@justbecausenetwork.com
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">{c.visitUs || "Visit Us"}</h3>
                    <p className="text-sm text-muted-foreground">
                      123 Impact Way, Tech Park<br />
                      Bangalore, Karnataka 560001<br />
                      India
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <Phone className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">{c.callUs || "Call Us"}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {c.callUsHours || "Mon-Fri from 9am to 6pm."}
                    </p>
                    <a href="tel:+919876543210" className="text-primary hover:underline">
                      +91 98765 43210
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
