"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Building2, Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { selectRole } from "@/lib/actions"
import { AuthPageSkeleton } from "@/components/ui/page-skeletons"
import { useLocale, localePath } from "@/hooks/use-locale"

function RoleSelectContent() {
  const router = useRouter()
  const locale = useLocale()
  
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"volunteer" | "ngo" | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Check if user is authenticated
  const { data: session, isPending } = authClient.useSession()

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
        router.push(localePath("/volunteer/onboarding", locale))
      } else {
        router.push(localePath("/ngo/onboarding", locale))
      }
    } catch (error) {
      console.error("Error updating role:", error)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
      setSelectedRole(null)
    }
  }

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (!isPending && !session?.user) {
      router.push(localePath("/auth/signin", locale))
      return
    }
    
    if (session?.user) {
      const role = session.user.role as string
      const isOnboarded = (session.user as any).isOnboarded === true
      
      // If user is already onboarded, redirect to dashboard
      if (isOnboarded) {
        if (role === "volunteer") {
          router.push(localePath("/volunteer/dashboard", locale))
        } else if (role === "ngo") {
          router.push(localePath("/ngo/dashboard", locale))
        } else if (role === "admin") {
          router.push(localePath("/admin", locale))
        }
        return
      }
      
      // If user has a valid role but not onboarded, redirect to onboarding
      if (role === "volunteer") {
        router.push(localePath("/volunteer/onboarding", locale))
        return
      } else if (role === "ngo") {
        router.push(localePath("/ngo/onboarding", locale))
        return
      }
      // Otherwise, user needs to select a role (stay on this page)
    }
  }, [session, isPending, router, locale])

  // Show loading while checking session
  if (isPending) {
    return <AuthPageSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to JustBeCause Network</h1>
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
              <CardTitle className="text-xl">I'm an Candidate</CardTitle>
              <CardDescription>
                Share your skills and make an impact
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>✓ Create your skills-based profile</li>
                <li>✓ Browse candidate jobs</li>
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
                  "Continue as Candidate"
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
                Find skilled candidates for your cause
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>✓ Create your organization profile</li>
                <li>✓ Post candidate opportunities</li>
                <li>✓ Browse skilled candidates</li>
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

// Loading fallback for Suspense
function RoleSelectLoading() {
  return <AuthPageSkeleton />
}

// Main export with Suspense boundary for useSearchParams
export default function RoleSelectPage() {
  return (
    <Suspense fallback={<RoleSelectLoading />}>
      <RoleSelectContent />
    </Suspense>
  )
}
