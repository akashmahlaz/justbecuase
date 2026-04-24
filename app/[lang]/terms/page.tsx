import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Terms of Service for JustBeCause Network. Understand the rules, guidelines, and conditions for using our skills-based volunteering platform.",
  openGraph: {
    title: "Terms of Service | JustBeCause Network",
    description: "Rules and guidelines for using JustBeCause Network.",
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Legal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: December 6, 2025
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  By accessing and using JustBeCause Network ("the Platform"), you accept and agree to be bound by
                  these Terms of Service. If you do not agree to these terms, please do not use the Platform.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  <strong>2.1 Registration:</strong> You must provide accurate and complete information when
                  creating an account. You are responsible for maintaining the confidentiality of your account
                  credentials.
                </p>
                <p>
                  <strong>2.2 Account Types:</strong> The Platform offers two types of accounts: Candidate
                  accounts and Enterprise/Nonprofit accounts. You may only create one account per entity.
                </p>
                <p>
                  <strong>2.3 Verification:</strong> Enterprise accounts may be subject to verification to ensure they
                  represent legitimate nonprofit organizations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. User Conduct</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>Users agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide truthful and accurate information</li>
                  <li>Use the Platform for its intended purpose of skills-based contributions</li>
                  <li>Respect intellectual property rights</li>
                  <li>Not engage in harassment, discrimination, or abusive behavior</li>
                  <li>Not use the Platform for commercial solicitation unrelated to impact work</li>
                  <li>Not impersonate others or create fake accounts</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Candidate Services</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  <strong>4.1 Pro-Bono Services:</strong> The Platform primarily facilitates pro-bono candidate
                  services. Any paid arrangements must be clearly disclosed and agreed upon between parties.
                </p>
                <p>
                  <strong>4.2 No Employment Relationship:</strong> JustBeCause Network does not create an employment
                  relationship between candidates and Enterprises. Users are responsible for their own tax and legal
                  obligations.
                </p>
                <p>
                  <strong>4.3 Quality of Work:</strong> While we encourage high-quality candidate work, we do not
                  guarantee the quality, completeness, or timeliness of services provided through the Platform.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  <strong>5.1 Platform Content:</strong> All content on the Platform, including design, logos, and
                  text, is owned by JustBeCause Network and protected by copyright laws.
                </p>
                <p>
                  <strong>5.2 User Content:</strong> You retain ownership of content you post but grant us a
                  license to use, display, and distribute it on the Platform.
                </p>
                <p>
                  <strong>5.3 Work Product:</strong> Intellectual property rights for work created through
                  volunteer projects should be agreed upon between candidates and Enterprises before project commencement.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  JustBeCause Network is a platform connecting candidates with Enterprises. We are not responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The quality or outcome of candidate work</li>
                  <li>Disputes between users</li>
                  <li>Loss or damage resulting from use of the Platform</li>
                  <li>Actions or omissions of users</li>
                  <li>Accuracy of user-provided information</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Privacy and Data Protection</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  Your use of the Platform is also governed by our Privacy Policy. By using the Platform, you
                  consent to our collection and use of your data as described in the Privacy Policy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Termination</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  We reserve the right to suspend or terminate accounts that violate these Terms of Service or
                  engage in behavior harmful to the Platform or its users.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  We may update these Terms of Service from time to time. Continued use of the Platform after
                  changes constitutes acceptance of the new terms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>For questions about these Terms of Service, please contact us at:</p>
                <p className="font-medium">support@justbecausenetwork.com</p>
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
