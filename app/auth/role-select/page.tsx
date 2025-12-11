"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Building2, Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { selectRole } from "@/lib/actions"

export default function RoleSelectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"volunteer" | "ngo" | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Check if user is authenticated
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (!isPending && !session?.user) {
      router.push("/auth/signin")
    }
    // Redirect to appropriate dashboard if user already has a role
    if (session?.user?.role) {
      const role = session.user.role as string
      if (role === "volunteer") {
        router.push("/volunteer/dashboard")
      } else if (role === "ngo") {
        router.push("/ngo/dashboard")
      } else if (role === "admin") {
        router.push("/admin")
      }
    }
  }, [session, isPending, router])

  const handleRoleSelect = async (role: "volunteer" | "ngo") => {
    setIsLoading(true)
    setSelectedRole(role)
    setError(null)

    try {
      // Use secure server action instead of client-side updateUser
      const result = await selectRole(role)
      
      if (!result.success) {
        setError(result.error || "Failed to select role")
        setIsLoading(false)
        setSelectedRole(null)
        return
      }

      // Redirect to appropriate onboarding
      if (role === "volunteer") {
        router.push("/volunteer/onboarding")
      } else {
        router.push("/ngo/onboarding")
      }
    } catch (error) {
      console.error("Error updating role:", error)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
      setSelectedRole(null)
    }
  }

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to JustBecause.Asia</h1>
          <p className="text-lg text-muted-foreground">
            How would you like to use the platform?
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Volunteer Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary ${
              selectedRole === "volunteer" ? "border-primary ring-2 ring-primary" : ""
            }`}
            onClick={() => !isLoading && handleRoleSelect("volunteer")}
          >
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-xl">I'm a Volunteer</CardTitle>
              <CardDescription>
                Share your skills and make an impact
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>✓ Create your skills-based profile</li>
                <li>✓ Browse volunteer opportunities</li>
                <li>✓ Connect with NGOs</li>
                <li>✓ Track your social impact</li>
              </ul>
              <Button
                className="w-full"
                disabled={isLoading}
                variant={selectedRole === "volunteer" ? "default" : "outline"}
              >
                {isLoading && selectedRole === "volunteer" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Continue as Volunteer"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* NGO Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg hover:border-secondary ${
              selectedRole === "ngo" ? "border-secondary ring-2 ring-secondary" : ""
            }`}
            onClick={() => !isLoading && handleRoleSelect("ngo")}
          >
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-10 w-10 text-secondary" />
              </div>
              <CardTitle className="text-xl">I'm an NGO</CardTitle>
              <CardDescription>
                Find skilled volunteers for your cause
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>✓ Create your organization profile</li>
                <li>✓ Post volunteer opportunities</li>
                <li>✓ Browse skilled volunteers</li>
                <li>✓ Manage applications</li>
              </ul>
              <Button
                className="w-full"
                disabled={isLoading}
                variant={selectedRole === "ngo" ? "default" : "outline"}
              >
                {isLoading && selectedRole === "ngo" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Continue as NGO"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          You can always update this later in your settings
        </p>
      </div>
    </div>
  )
}
