"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useGeolocated } from "react-geolocated"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group"
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  User,
  Briefcase,
  MapPin,
  Loader2,
  CheckCircle,
  Clock,
  DollarSign,
  Lightbulb,
  LocateFixed,
  Phone,
  ShieldCheck,
} from "lucide-react"
import { skillCategories, experienceLevels, causes, workModes } from "../../../lib/skills-data"
import { saveVolunteerOnboarding, completeOnboarding } from "@/lib/actions"
import { authClient } from "@/lib/auth-client"

type SelectedSkill = {
  categoryId: string
  subskillId: string
  level: string
}

export default function VolunteerOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState("")
  const totalSteps = 5

  // Check if user is authenticated
  const { data: session, isPending } = authClient.useSession()
  
  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        // Not authenticated, redirect to sign in
        router.push("/auth/signin")
      } else {
        const user = session.user as any
        // If already onboarded, redirect to dashboard
        if (user.isOnboarded) {
          router.push("/volunteer/dashboard")
        } else if (user.role !== "volunteer" && user.role !== "user") {
          // Wrong role, redirect to correct onboarding or dashboard
          if (user.role === "ngo") {
            router.push("/ngo/onboarding")
          } else {
            router.push("/auth/role-select")
          }
        } else {
          setIsCheckingAuth(false)
        }
      }
    }
  }, [session, isPending, router])

  // Step 1: Profile basics
  const [profile, setProfile] = useState({
    phone: "",
    location: "",
    bio: "",
    linkedinUrl: "",
    portfolioUrl: "",
  })

  // Phone verification state
  const [phoneVerificationStep, setPhoneVerificationStep] = useState<"input" | "otp" | "verified">("input")
  const [phoneOtp, setPhoneOtp] = useState(["", "", "", "", "", ""])
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false)
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0)
  const [devOtp, setDevOtp] = useState<string | null>(null) // For development mode only
  const phoneOtpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Phone resend cooldown timer
  useEffect(() => {
    if (phoneResendCooldown > 0) {
      const timer = setTimeout(() => setPhoneResendCooldown(phoneResendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [phoneResendCooldown])

  // Use react-geolocated for geolocation
  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    getPosition,
    positionError,
  } = useGeolocated({
    positionOptions: { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    watchPosition: false,
    suppressLocationOnMount: true,
  });
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Geolocation function using react-geolocated
  const getExactLocation = async () => {
    if (!isGeolocationAvailable) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    if (!isGeolocationEnabled) {
      setError("Geolocation is disabled. Please enable location services.");
      return;
    }
    setError(""); // Clear any previous errors
    setIsGettingLocation(true);
    getPosition();
  };

  // Google Geocoding location detection
  const getGoogleLocation = async () => {
    console.log('[Location Debug] Starting Google location detection');
    setError(""); // Clear any previous errors
    setIsGettingLocation(true);
    
    if (!isGeolocationAvailable) {
      console.log('[Location Debug] Geolocation not supported by browser');
      setError("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      return;
    }
    if (!isGeolocationEnabled) {
      console.log('[Location Debug] Geolocation is disabled');
      setError("Geolocation is disabled. Please enable location services.");
      setIsGettingLocation(false);
      return;
    }
    
    console.log('[Location Debug] Requesting geolocation from browser');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('[Location Debug] Geolocation received:', position.coords);
        const { latitude, longitude } = position.coords;
        
        try {
          console.log('[Location Debug] Calling geocoding API with coordinates:', { lat: latitude, lng: longitude });
          const response = await fetch('/api/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });
          
          console.log('[Location Debug] API response status:', response.status);
          const data = await response.json();
          console.log('[Location Debug] API response data:', data);
          
          if (data.success && data.location) {
            console.log('[Location Debug] Location data received:', data.location);
            const { city, state, country, coordinates } = data.location;
            const locationParts = [city, state, country].filter(Boolean);
            
            if (locationParts.length > 0) {
              console.log('[Location Debug] Setting location to:', locationParts.join(", "));
              setProfile(prev => ({ ...prev, location: locationParts.join(", ") }));
            } else {
              console.log('[Location Debug] No location parts found');
              setError("Could not determine location details");
            }
            
            if (coordinates) {
              console.log('[Location Debug] Setting coordinates:', coordinates);
              setCoordinates(coordinates);
            }
          } else if (data.status === "REQUEST_DENIED") {
            console.log('[Location Debug] Google Geocoding API request denied');
            setError("Location service temporarily unavailable. Please enter your location manually.");
            console.warn("Google Geocoding API is restricted. Using fallback method.");
            
            // Fallback to basic coordinates display
            setProfile(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
            setCoordinates({ lat: latitude, lng: longitude });
          } else {
            console.log('[Location Debug] Geocoding failed with error:', data.error);
            setError(data.error || "Failed to get location details");
          }
        } catch (err) {
          console.error('[Location Debug] Google geocoding error:', err);
          setError("Failed to get location details. Please try manual entry.");
        } finally {
          console.log('[Location Debug] Location detection finished');
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.log('[Location Debug] Geolocation error:', error);
        let errorMessage = "Unable to get your location.";
        if (error.code === 1) {
          console.log('[Location Debug] Error code 1: Permission denied');
          errorMessage = "Location permission denied. Please enable location services in your browser settings.";
        } else if (error.code === 2) {
          console.log('[Location Debug] Error code 2: Position unavailable');
          errorMessage = "Location unavailable. Your device may not support geolocation or network location services are disabled.";
        } else if (error.code === 3) {
          console.log('[Location Debug] Error code 3: Timeout');
          errorMessage = "Location request timed out. Please check your internet connection and try again. This can happen in areas with poor GPS signal.";
        }
        setError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // When coords change, reverse geocode
  useEffect(() => {
    const fetchLocation = async () => {
      if (coords) {
        setCoordinates({ lat: coords.latitude, lng: coords.longitude });
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10`,
            {
              headers: {
                'User-Agent': 'JustBecause.asia/1.0',
                'Accept-Language': 'en-US,en;q=0.9'
              }
            }
          );
          if (!response.ok) throw new Error('Failed to fetch address');
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.suburb;
          const state = data.address?.state;
          const country = data.address?.country;
          const locationParts = [city, state, country].filter(Boolean);
          const locationString = locationParts.join(", ");
          if (locationString) {
            setProfile(prev => ({ ...prev, location: locationString }));
          } else {
            setProfile(prev => ({ ...prev, location: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` }));
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          setError('Failed to fetch location details. Using coordinates instead.');
          setProfile(prev => ({ ...prev, location: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` }));
          // Clear error after 5 seconds
          setTimeout(() => setError(''), 5000);
        }
        setIsGettingLocation(false);
      }
    };
    if (isGettingLocation && coords) {
      fetchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  useEffect(() => {
    if (positionError && isGettingLocation) {
      let errorMessage = "Unable to get your location.";
      if (positionError.code === 1) errorMessage = "Location permission denied. Please enable location services in your browser settings.";
      else if (positionError.code === 2) errorMessage = "Location unavailable. Your device may not support geolocation or network location services are disabled.";
      else if (positionError.code === 3) errorMessage = "Location request timed out. Please check your internet connection and try again. This can happen in areas with poor GPS signal.";
      setError(errorMessage);
      setIsGettingLocation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionError]);

  // Step 2: Skills
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Step 3: Causes & Interests
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])

  // Step 4: Work preferences
  const [workPreferences, setWorkPreferences] = useState({
    volunteerType: "free", // free, paid, both
    workMode: "remote", // remote, onsite, hybrid
    hoursPerWeek: "5-10",
    availability: "weekends", // weekdays, weekends, evenings, flexible
  })

  const progress = (step / totalSteps) * 100

  // Phone verification functions
  const sendPhoneOtp = async () => {
    if (!profile.phone || profile.phone.length < 10) {
      setError("Please enter a valid phone number")
      return
    }
    
    setError("")
    setPhoneOtpLoading(true)
    
    try {
      const response = await fetch("/api/auth/send-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: profile.phone }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Failed to send verification code")
        setPhoneOtpLoading(false)
        return
      }
      
      // For development mode, store the OTP
      if (data.devOtp) {
        setDevOtp(data.devOtp)
      }
      
      setPhoneVerificationStep("otp")
      setPhoneResendCooldown(60)
    } catch (err: any) {
      setError("Failed to send verification code. Please try again.")
    } finally {
      setPhoneOtpLoading(false)
    }
  }

  const verifyPhoneOtp = async () => {
    const otpCode = phoneOtp.join("")
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }
    
    setError("")
    setPhoneOtpLoading(true)
    
    try {
      const response = await fetch("/api/auth/verify-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: profile.phone, otp: otpCode }),
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        setError(data.error || "Invalid verification code")
        setPhoneOtpLoading(false)
        return
      }
      
      setPhoneVerificationStep("verified")
      setDevOtp(null)
    } catch (err: any) {
      setError("Failed to verify code. Please try again.")
    } finally {
      setPhoneOtpLoading(false)
    }
  }

  const handlePhoneOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    
    const newOtp = [...phoneOtp]
    newOtp[index] = value.slice(-1)
    setPhoneOtp(newOtp)
    
    if (value && index < 5) {
      phoneOtpRefs.current[index + 1]?.focus()
    }
  }

  const handlePhoneOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pastedData) {
      const newOtp = [...phoneOtp]
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || ""
      }
      setPhoneOtp(newOtp)
      const lastIndex = Math.min(pastedData.length, 5)
      phoneOtpRefs.current[lastIndex]?.focus()
    }
  }

  const handlePhoneOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !phoneOtp[index] && index > 0) {
      phoneOtpRefs.current[index - 1]?.focus()
    }
  }

  const handleSkillToggle = (categoryId: string, subskillId: string) => {
    const existing = selectedSkills.find(
      (s) => s.categoryId === categoryId && s.subskillId === subskillId
    )

    if (existing) {
      setSelectedSkills(selectedSkills.filter((s) => !(s.categoryId === categoryId && s.subskillId === subskillId)))
    } else {
      setSelectedSkills([
        ...selectedSkills,
        { categoryId, subskillId, level: "intermediate" },
      ])
    }
  }

  const handleSkillLevelChange = (categoryId: string, subskillId: string, level: string) => {
    setSelectedSkills(
      selectedSkills.map((s) =>
        s.categoryId === categoryId && s.subskillId === subskillId
          ? { ...s, level }
          : s
      )
    )
  }

  const isSkillSelected = (categoryId: string, subskillId: string) => {
    return selectedSkills.some((s) => s.categoryId === categoryId && s.subskillId === subskillId)
  }

  const handleCauseToggle = (causeId: string) => {
    if (selectedCauses.includes(causeId)) {
      setSelectedCauses(selectedCauses.filter((c) => c !== causeId))
    } else if (selectedCauses.length < 5) {
      setSelectedCauses([...selectedCauses, causeId])
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Save onboarding data to backend
      const onboardingData = {
        profile: {
          ...profile,
          coordinates, // Include exact coordinates if captured
        },
        skills: selectedSkills,
        causes: selectedCauses,
        workPreferences,
      }

      const result = await saveVolunteerOnboarding(onboardingData)
      
      if (!result.success) {
        setError(result.error || "Failed to save profile")
        console.error("Failed to save profile:", result.error)
        setIsLoading(false)
        return
      }

      // Mark user as onboarded
      const onboardResult = await completeOnboarding()
      
      if (!onboardResult.success) {
        console.error("Failed to complete onboarding:", onboardResult.error)
        // Still redirect - profile is saved
      }

      // Redirect to dashboard
      router.push("/volunteer/dashboard")
    } catch (error) {
      console.error("Onboarding error:", error)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Tell us about yourself</h2>
        <p className="text-muted-foreground">Help NGOs understand who you are</p>
      </div>

      <div className="grid gap-4">
        {/* Phone Number with Verification */}
        <div className="space-y-3">
          <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
          
          {phoneVerificationStep === "input" && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="pl-10"
                />
              </div>
              <Button
                type="button"
                onClick={sendPhoneOtp}
                disabled={phoneOtpLoading || !profile.phone}
                className="shrink-0"
              >
                {phoneOtpLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          )}

          {phoneVerificationStep === "otp" && (
            <div className="p-4 rounded-lg border bg-muted/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enter verification code</p>
                  <p className="text-xs text-muted-foreground">Sent to {profile.phone}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhoneVerificationStep("input")
                    setPhoneOtp(["", "", "", "", "", ""])
                    setDevOtp(null)
                  }}
                >
                  Change
                </Button>
              </div>
              
              {/* Dev mode OTP display */}
              {devOtp && (
                <div className="p-2 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs text-center">
                  <span className="font-medium">Dev Mode:</span> OTP is <span className="font-mono font-bold">{devOtp}</span>
                </div>
              )}
              
              <div className="flex justify-center gap-2" onPaste={handlePhoneOtpPaste}>
                {phoneOtp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { phoneOtpRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePhoneOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handlePhoneOtpKeyDown(index, e)}
                    className="w-10 h-12 text-center text-xl font-bold"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={verifyPhoneOtp}
                  disabled={phoneOtpLoading || phoneOtp.join("").length !== 6}
                  className="w-full"
                >
                  {phoneOtpLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verify Phone
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Didn't receive code?{" "}
                  {phoneResendCooldown > 0 ? (
                    <span>Resend in {phoneResendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={sendPhoneOtp}
                      disabled={phoneOtpLoading}
                    >
                      Resend
                    </button>
                  )}
                </p>
              </div>
            </div>
          )}

          {phoneVerificationStep === "verified" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">{profile.phone}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Phone verified</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhoneVerificationStep("input")
                  setProfile({ ...profile, phone: "" })
                  setPhoneOtp(["", "", "", "", "", ""])
                }}
              >
                Change
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="City, Country"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={getGoogleLocation}
              disabled={isGettingLocation}
              className="shrink-0"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LocateFixed className="h-4 w-4 mr-2" />
                  Use my location
                </>
              )}
            </Button>
          </div>
          {coordinates && (
            <p className="text-xs text-muted-foreground">
              📍 Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Professional Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us about your professional background and what drives you to volunteer..."
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn URL (optional)</Label>
            <Input
              id="linkedin"
              placeholder="https://linkedin.com/in/yourprofile"
              value={profile.linkedinUrl}
              onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio URL (optional)</Label>
            <Input
              id="portfolio"
              placeholder="https://yourportfolio.com"
              value={profile.portfolioUrl}
              onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">What are your skills?</h2>
        <p className="text-muted-foreground">
          Select the skills you can offer to NGOs. You can add up to 10 skills.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {skillCategories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
            {selectedSkills.filter((s) => s.categoryId === category.id).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedSkills.filter((s) => s.categoryId === category.id).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {activeCategory && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {skillCategories.find((c) => c.id === activeCategory)?.name}
            </CardTitle>
            <CardDescription>
              Select the specific skills you have in this category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {skillCategories
                .find((c) => c.id === activeCategory)
                ?.subskills.map((subskill) => {
                  const selected = isSkillSelected(activeCategory, subskill.id)
                  return (
                    <div
                      key={subskill.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleSkillToggle(activeCategory, subskill.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{subskill.name}</span>
                        {selected && <CheckCircle className="h-4 w-4 text-primary" />}
                      </div>
                      {selected && (
                        <div className="mt-2 flex gap-1">
                          {experienceLevels.map((level) => {
                            const skill = selectedSkills.find(
                              (s) => s.categoryId === activeCategory && s.subskillId === subskill.id
                            )
                            return (
                              <Badge
                                key={level.id}
                                variant={skill?.level === level.id ? "default" : "outline"}
                                className="cursor-pointer text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSkillLevelChange(activeCategory, subskill.id, level.id)
                                }}
                              >
                                {level.name}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSkills.length > 0 && (
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">
            Selected skills ({selectedSkills.length}/10):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => {
              const category = skillCategories.find((c) => c.id === skill.categoryId)
              const subskill = category?.subskills.find((s) => s.id === skill.subskillId)
              const level = experienceLevels.find((l) => l.id === skill.level)
              return (
                <Badge key={`${skill.categoryId}-${skill.subskillId}`} variant="secondary">
                  {subskill?.name} ({level?.name})
                </Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">What causes do you care about?</h2>
        <p className="text-muted-foreground">Select up to 5 causes you're passionate about</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {causes.map((cause) => (
          <div
            key={cause.id}
            onClick={() => handleCauseToggle(cause.id)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedCauses.includes(cause.id)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cause.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{cause.name}</p>
              </div>
              {selectedCauses.includes(cause.id) && (
                <CheckCircle className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Selected: {selectedCauses.length}/5
      </p>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Your work preferences</h2>
        <p className="text-muted-foreground">Help us match you with the right opportunities</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Volunteer Type
          </Label>
          <RadioGroup
            value={workPreferences.volunteerType}
            onValueChange={(value: string) =>
              setWorkPreferences({ ...workPreferences, volunteerType: value })
            }
            className="grid sm:grid-cols-3 gap-3"
          >
            <Label
              htmlFor="free"
              className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                workPreferences.volunteerType === "free"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="free" id="free" className="sr-only" />
              <Heart className="h-6 w-6 mb-2 text-primary" />
              <span className="font-medium">Pro-Bono Only</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Volunteer for free
              </span>
            </Label>
            <Label
              htmlFor="paid"
              className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                workPreferences.volunteerType === "paid"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="paid" id="paid" className="sr-only" />
              <DollarSign className="h-6 w-6 mb-2 text-green-600" />
              <span className="font-medium">Paid Only</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Charge for your time
              </span>
            </Label>
            <Label
              htmlFor="both"
              className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                workPreferences.volunteerType === "both"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="both" id="both" className="sr-only" />
              <Lightbulb className="h-6 w-6 mb-2 text-amber-500" />
              <span className="font-medium">Open to Both</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Flexible based on project
              </span>
            </Label>
          </RadioGroup>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Work Mode
          </Label>
          <RadioGroup
            value={workPreferences.workMode}
            onValueChange={(value: string) =>
              setWorkPreferences({ ...workPreferences, workMode: value })
            }
            className="grid sm:grid-cols-3 gap-3"
          >
            {workModes.map((mode) => (
              <Label
                key={mode.id}
                htmlFor={mode.id}
                className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  workPreferences.workMode === mode.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value={mode.id} id={mode.id} className="sr-only" />
                <span className="text-2xl mb-2">{mode.icon}</span>
                <span className="font-medium">{mode.name}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hours per Week
            </Label>
            <RadioGroup
              value={workPreferences.hoursPerWeek}
              onValueChange={(value: string) =>
                setWorkPreferences({ ...workPreferences, hoursPerWeek: value })
              }
              className="space-y-2"
            >
              {["1-5", "5-10", "10-20", "20+"].map((hours) => (
                <Label
                  key={hours}
                  htmlFor={`hours-${hours}`}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    workPreferences.hoursPerWeek === hours
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={hours} id={`hours-${hours}`} className="mr-3" />
                  {hours} hours/week
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Availability
            </Label>
            <RadioGroup
              value={workPreferences.availability}
              onValueChange={(value: string) =>
                setWorkPreferences({ ...workPreferences, availability: value })
              }
              className="space-y-2"
            >
              {[
                { id: "weekdays", label: "Weekdays (9am-5pm)" },
                { id: "evenings", label: "Evenings (after 6pm)" },
                { id: "weekends", label: "Weekends" },
                { id: "flexible", label: "Flexible" },
              ].map((option) => (
                <Label
                  key={option.id}
                  htmlFor={`avail-${option.id}`}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    workPreferences.availability === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={option.id} id={`avail-${option.id}`} className="mr-3" />
                  {option.label}
                </Label>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">You're all set!</h2>
        <p className="text-muted-foreground">Review your profile and start exploring opportunities</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Profile</h3>
              <p className="text-foreground">{profile.location || "Location not set"}</p>
              <p className="text-sm text-muted-foreground">{profile.bio?.slice(0, 100) || "No bio"}...</p>
            </div>
            <Separator />
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Skills ({selectedSkills.length})</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSkills.slice(0, 5).map((skill) => {
                  const category = skillCategories.find((c) => c.id === skill.categoryId)
                  const subskill = category?.subskills.find((s) => s.id === skill.subskillId)
                  return (
                    <Badge key={`${skill.categoryId}-${skill.subskillId}`} variant="secondary">
                      {subskill?.name}
                    </Badge>
                  )
                })}
                {selectedSkills.length > 5 && (
                  <Badge variant="outline">+{selectedSkills.length - 5} more</Badge>
                )}
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Causes</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedCauses.map((causeId) => {
                  const cause = causes.find((c) => c.id === causeId)
                  return (
                    <Badge key={causeId} variant="secondary">
                      {cause?.icon} {cause?.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Work Type</h3>
                <p className="text-foreground capitalize">{workPreferences.volunteerType}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Work Mode</h3>
                <p className="text-foreground capitalize">{workPreferences.workMode}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Hours/Week</h3>
                <p className="text-foreground">{workPreferences.hoursPerWeek}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Availability</h3>
                <p className="text-foreground capitalize">{workPreferences.availability}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Show loading state while checking authentication
  if (isPending || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Complete Your Profile</h1>
            <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="mb-8" />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button 
              onClick={() => {
                // Validate step 1: phone must be verified
                if (step === 1) {
                  if (phoneVerificationStep !== "verified") {
                    setError("Please verify your phone number to continue")
                    return
                  }
                  if (!profile.location) {
                    setError("Please enter your location")
                    return
                  }
                }
                setError("")
                setStep(step + 1)
              }}
              disabled={step === 1 && phoneVerificationStep !== "verified"}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
