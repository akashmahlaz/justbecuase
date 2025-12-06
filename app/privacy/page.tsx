import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 md:px-6 py-12 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: December 6, 2025
          </p>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  <strong>1.1 Account Information:</strong> When you create an account, we collect your name,
                  email address, phone number, location, and professional information.
                </p>
                <p>
                  <strong>1.2 Profile Data:</strong> For volunteers, we collect skills, experience levels, work
                  preferences, and causes of interest. For NGOs, we collect organization details, registration
                  information, and project requirements.
                </p>
                <p>
                  <strong>1.3 Usage Data:</strong> We collect information about how you use the Platform,
                  including pages visited, features used, and interactions with other users.
                </p>
                <p>
                  <strong>1.4 Communications:</strong> We store messages and communications between users on the
                  Platform to facilitate project collaboration.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and improve the Platform services</li>
                  <li>Match volunteers with appropriate NGO projects</li>
                  <li>Facilitate communication between users</li>
                  <li>Send notifications about projects, applications, and platform updates</li>
                  <li>Verify NGO legitimacy and maintain platform security</li>
                  <li>Analyze platform usage to improve user experience</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Information Sharing</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  <strong>3.1 Between Users:</strong> Your profile information is visible to other users to
                  facilitate matching. Volunteers can see NGO project details, and NGOs can see volunteer profiles
                  who apply to their projects.
                </p>
                <p>
                  <strong>3.2 Service Providers:</strong> We may share information with third-party service
                  providers who help us operate the Platform (e.g., hosting, analytics, email services).
                </p>
                <p>
                  <strong>3.3 Legal Requirements:</strong> We may disclose information if required by law or to
                  protect our rights and safety or that of others.
                </p>
                <p>
                  <strong>3.4 With Your Consent:</strong> We may share information with other parties when you
                  give us explicit consent to do so.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Data Security</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  We implement industry-standard security measures to protect your data, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure authentication using Better Auth with MongoDB</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and monitoring</li>
                </ul>
                <p>
                  However, no method of transmission over the Internet is 100% secure. We cannot guarantee
                  absolute security of your data.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Your Rights and Choices</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access and download your personal data</li>
                  <li>Correct inaccurate information in your profile</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt-out of non-essential communications</li>
                  <li>Control visibility of certain profile information</li>
                  <li>Object to processing of your data for certain purposes</li>
                </ul>
                <p>
                  To exercise these rights, please contact us at privacy@justbecause.asia or through your account
                  settings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  We retain your information for as long as your account is active or as needed to provide
                  services. If you delete your account, we will delete or anonymize your data within 90 days,
                  except where we are required to retain it for legal or compliance purposes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Cookies and Tracking</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  We use cookies and similar technologies to enhance your experience, analyze usage, and provide
                  personalized content. You can control cookie preferences through your browser settings, but
                  disabling cookies may limit platform functionality.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. International Data Transfers</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  Your information may be transferred to and processed in countries other than your own. We ensure
                  appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  The Platform is not intended for users under 18 years of age. We do not knowingly collect
                  personal information from children. If we become aware that we have collected data from a child,
                  we will take steps to delete it.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Changes to This Policy</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of significant changes
                  via email or through a prominent notice on the Platform. Your continued use after changes
                  constitutes acceptance of the updated policy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>11. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  If you have questions or concerns about this Privacy Policy or our data practices, please
                  contact us at:
                </p>
                <p className="font-medium">
                  Email: privacy@justbecause.asia
                  <br />
                  Platform: JustBecause.asia
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
