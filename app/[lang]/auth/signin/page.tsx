"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import LocaleLink from "@/components/locale-link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Heart, Mail, Lock, Loader2 } from "lucide-react"
import { signIn, getSession } from "@/lib/auth-client"
import { useDictionary } from "@/components/dictionary-provider"
import { useLocale, localePath } from "@/hooks/use-locale"

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageInner />
    </Suspense>
  )
}

function SignInPageInner() {
  const dict = useDictionary()
  const a = (dict as any).auth || {}
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<"google" | "linkedin" | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  // Check for OAuth callback errors in URL
  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_code: a.oauthInvalidCode || "Sign-in session expired. Please try again.",
        access_denied: a.oauthAccessDenied || "Access was denied. Please try again or use a different sign-in method.",
        server_error: a.oauthServerError || "The sign-in service is temporarily unavailable. Please try again later.",
      }
      setError(errorMessages[errorParam] || a.oauthGenericError || "Sign-in failed. Please try again.")
    }
  }, [searchParams])

  // Handle redirect after successful login
  const handlePostLoginRedirect = async () => {
    console.log("[signin] handlePostLoginRedirect: fetching session...")
    const session = await getSession()
    const user = session?.data?.user as any
    console.log("[signin] handlePostLoginRedirect: session result =", {
      hasUser: !!user,
      role: user?.role,
      isOnboarded: user?.isOnboarded,
      id: user?.id,
      email: user?.email,
    })

    if (user) {
      // Redirect based on role and onboarding status
      if (!user.isOnboarded) {
        // Check if user has selected a role yet
        if (user.role === "volunteer") {
          console.log("[signin] redirecting to volunteer onboarding")
          router.push(localePath("/volunteer/onboarding", locale))
        } else if (user.role === "ngo") {
          console.log("[signin] redirecting to ngo onboarding")
          router.push(localePath("/ngo/onboarding", locale))
        } else {
          // User hasn't selected a role yet (role is "user" or undefined)
          console.log("[signin] redirecting to role-select (role=", user.role, ")")
          router.push(localePath("/auth/role-select", locale))
        }
      } else {
        // User is onboarded, go to dashboard
        if (user.role === "volunteer") {
          console.log("[signin] redirecting to volunteer dashboard")
          router.push(localePath("/volunteer/dashboard", locale))
        } else if (user.role === "ngo") {
          console.log("[signin] redirecting to ngo dashboard")
          router.push(localePath("/ngo/dashboard", locale))
        } else if (user.role === "admin") {
          console.log("[signin] redirecting to admin dashboard")
          router.push(localePath("/admin/dashboard", locale))
        } else {
          console.log("[signin] redirecting to home (unknown role:", user.role, ")")
          router.push(localePath("/", locale))
        }
      }
    } else {
      console.log("[signin] no user in session, redirecting to home")
      router.push(localePath("/", locale))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log("[signin] signIn.email starting...")
      const { error: signInError } = await signIn.email({
        email,
        password,
      })

      if (signInError) {
        console.log("[signin] signIn.email FAILED:", signInError.message)
        setError(signInError.message || "Invalid email or password")
        setIsLoading(false)
        return
      }

      console.log("[signin] signIn.email SUCCESS, cookies:", document.cookie)
      await handlePostLoginRedirect()
    } catch (err: any) {
      console.error("[signin] signIn.email EXCEPTION:", err)
      setError(err.message || "Something went wrong")
      setIsLoading(false)
    }
  }

  // Handle social sign-in (Google/LinkedIn)
  const handleSocialSignIn = async (provider: "google" | "linkedin") => {
    setSocialLoading(provider)
    setError("")

    try {
      console.log(`[signin] starting social sign-in: ${provider}`)
      // For signin, we assume user exists - redirect based on role
      // The role-select page will handle redirection if user already has a role
      await signIn.social({
        provider,
        callbackURL: localePath("/auth/role-select", locale), // Use locale-prefixed callbackURL
      })
      // Note: This won't execute as the page redirects to OAuth provider
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`)
      setSocialLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <LocaleLink href="/" className="flex items-center gap-2 mb-8">
            <Image src="/logo-main.png" alt="JBC Logo" width={240} height={117} className="h-20 w-auto" />
          </LocaleLink>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">{a.welcomeBack || "Welcome back"}</CardTitle>
              <CardDescription>{a.signInContinue || "Sign in to your account to continue making an impact"}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{a.email || "Email"}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={a.emailPlaceholder || "you@example.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{a.password || "Password"}</Label>
                    <LocaleLink href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                      {a.forgotPasswordLink || "Forgot password?"}
                    </LocaleLink>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={a.passwordPlaceholder || "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {a.signingIn || "Signing in..."}
                    </>
                  ) : (
                    a.signIn || "Sign In"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  {a.orContinueWith || "or continue with"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full bg-transparent"
                  onClick={() => handleSocialSignIn("google")}
                  disabled={socialLoading !== null || isLoading}
                >
                  {socialLoading === "google" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Google
                </Button>
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full bg-transparent"
                  onClick={() => handleSocialSignIn("linkedin")}
                  disabled={socialLoading !== null || isLoading}
                >
                  {socialLoading === "linkedin" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" fill="#0A66C2" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  )}
                  LinkedIn
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {(a.dontHaveAccount || "Don't have an account?") + " "}
                <LocaleLink href="/auth/signup" className="text-primary hover:underline font-medium">
                  {a.signUp || "Sign up"}
                </LocaleLink>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Image/Info */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-primary/80 items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">{a.makeDifference || "Make a Difference Today"}</h2>
          <p className="text-primary-foreground/90 mb-8">
            {a.makeDifferenceDesc || "Join thousands of skilled professionals who are creating lasting impact in communities worldwide."}
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Heart className="h-5 w-5" />
              </div>
              <span>{a.connectOpportunities || "Connect with meaningful jobs"}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Heart className="h-5 w-5" />
              </div>
              <span>{a.skillsForGood || "Use your skills for social good"}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Heart className="h-5 w-5" />
              </div>
              <span>{a.trackImpact || "Track your impact journey"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
