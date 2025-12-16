"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  // Geolocation function to get exact user location
  const getExactLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }

    setIsGettingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setCoordinates({ lat: latitude, lng: longitude })

        // Reverse geocode to get city name using a free API
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          )
          const data = await response.json()
          
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county
          const state = data.address?.state
          const country = data.address?.country
          
          const locationParts = [city, state, country].filter(Boolean)
          const locationString = locationParts.join(", ")
          
          setProfile(prev => ({ ...prev, location: locationString }))
        } catch (error) {
          console.error("Error reverse geocoding:", error)
          setProfile(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }))
        }
        
        setIsGettingLocation(false)
      },
      (error) => {
        console.error("Geolocation error:", error)
        alert("Unable to get your location. Please enter it manually.")
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

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
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="+91 98765 43210"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
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
              onClick={getExactLocation}
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
            <Button onClick={() => setStep(step + 1)}>
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
