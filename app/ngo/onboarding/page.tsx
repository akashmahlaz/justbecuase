"use client"

import type React from "react"
import { useState } from "react"
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
  Building2,
  MapPin,
  Loader2,
  CheckCircle,
  Globe,
  Users,
  FileText,
  Upload,
} from "lucide-react"
import { skillCategories, causes } from "../../../lib/skills-data"

type RequiredSkill = {
  categoryId: string
  subskillId: string
  priority: "must-have" | "nice-to-have"
}

export default function NGOOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const totalSteps = 4

  // Step 1: Organization details
  const [orgDetails, setOrgDetails] = useState({
    orgName: "",
    registrationNumber: "",
    website: "",
    phone: "",
    address: "",
    city: "",
    country: "India",
    description: "",
    mission: "",
    yearFounded: "",
    teamSize: "",
  })

  // Step 2: Cause & Focus
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])

  // Step 3: Skills needed
  const [requiredSkills, setRequiredSkills] = useState<RequiredSkill[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const progress = (step / totalSteps) * 100

  const handleCauseToggle = (causeId: string) => {
    if (selectedCauses.includes(causeId)) {
      setSelectedCauses(selectedCauses.filter((c) => c !== causeId))
    } else if (selectedCauses.length < 3) {
      setSelectedCauses([...selectedCauses, causeId])
    }
  }

  const handleSkillToggle = (categoryId: string, subskillId: string) => {
    const existing = requiredSkills.find(
      (s) => s.categoryId === categoryId && s.subskillId === subskillId
    )

    if (existing) {
      setRequiredSkills(
        requiredSkills.filter((s) => !(s.categoryId === categoryId && s.subskillId === subskillId))
      )
    } else {
      setRequiredSkills([
        ...requiredSkills,
        { categoryId, subskillId, priority: "nice-to-have" },
      ])
    }
  }

  const handleSkillPriorityChange = (
    categoryId: string,
    subskillId: string,
    priority: "must-have" | "nice-to-have"
  ) => {
    setRequiredSkills(
      requiredSkills.map((s) =>
        s.categoryId === categoryId && s.subskillId === subskillId
          ? { ...s, priority }
          : s
      )
    )
  }

  const isSkillSelected = (categoryId: string, subskillId: string) => {
    return requiredSkills.some((s) => s.categoryId === categoryId && s.subskillId === subskillId)
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      // TODO: Save onboarding data to backend
      const onboardingData = {
        orgDetails,
        causes: selectedCauses,
        requiredSkills,
      }

      console.log("NGO Onboarding data:", onboardingData)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Redirect to dashboard
      router.push("/ngo/dashboard")
    } catch (error) {
      console.error("Onboarding error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Organization Details</h2>
        <p className="text-muted-foreground">Tell us about your NGO or nonprofit</p>
      </div>

      <div className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              placeholder="Your NGO name"
              value={orgDetails.orgName}
              onChange={(e) => setOrgDetails({ ...orgDetails, orgName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration Number</Label>
            <Input
              id="registrationNumber"
              placeholder="NGO registration ID"
              value={orgDetails.registrationNumber}
              onChange={(e) =>
                setOrgDetails({ ...orgDetails, registrationNumber: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                placeholder="https://yourorg.org"
                value={orgDetails.website}
                onChange={(e) => setOrgDetails({ ...orgDetails, website: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="+91 98765 43210"
              value={orgDetails.phone}
              onChange={(e) => setOrgDetails({ ...orgDetails, phone: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="address"
              placeholder="Full address"
              value={orgDetails.address}
              onChange={(e) => setOrgDetails({ ...orgDetails, address: e.target.value })}
              className="pl-10 min-h-[80px]"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              placeholder="City"
              value={orgDetails.city}
              onChange={(e) => setOrgDetails({ ...orgDetails, city: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="Country"
              value={orgDetails.country}
              onChange={(e) => setOrgDetails({ ...orgDetails, country: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearFounded">Year Founded</Label>
            <Input
              id="yearFounded"
              placeholder="2010"
              value={orgDetails.yearFounded}
              onChange={(e) => setOrgDetails({ ...orgDetails, yearFounded: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">About Your Organization *</Label>
          <Textarea
            id="description"
            placeholder="Describe what your organization does..."
            value={orgDetails.description}
            onChange={(e) => setOrgDetails({ ...orgDetails, description: e.target.value })}
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mission">Mission Statement</Label>
          <Textarea
            id="mission"
            placeholder="Your organization's mission..."
            value={orgDetails.mission}
            onChange={(e) => setOrgDetails({ ...orgDetails, mission: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamSize">Team Size</Label>
          <RadioGroup
            value={orgDetails.teamSize}
            onValueChange={(value: string) => setOrgDetails({ ...orgDetails, teamSize: value })}
            className="flex flex-wrap gap-3"
          >
            {["1-5", "6-20", "21-50", "51-100", "100+"].map((size) => (
              <Label
                key={size}
                htmlFor={`size-${size}`}
                className={`flex items-center px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                  orgDetails.teamSize === size
                    ? "border-secondary bg-secondary/5"
                    : "border-border hover:border-secondary/50"
                }`}
              >
                <RadioGroupItem value={size} id={`size-${size}`} className="sr-only" />
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                {size}
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Your Cause Areas</h2>
        <p className="text-muted-foreground">Select up to 3 causes your organization focuses on</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {causes.map((cause) => (
          <div
            key={cause.id}
            onClick={() => handleCauseToggle(cause.id)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedCauses.includes(cause.id)
                ? "border-secondary bg-secondary/5"
                : "border-border hover:border-secondary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cause.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{cause.name}</p>
              </div>
              {selectedCauses.includes(cause.id) && (
                <CheckCircle className="h-4 w-4 text-secondary" />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">Selected: {selectedCauses.length}/3</p>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Skills You're Looking For</h2>
        <p className="text-muted-foreground">
          Select the skills that would help your organization most
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {skillCategories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "secondary" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
            {requiredSkills.filter((s) => s.categoryId === category.id).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {requiredSkills.filter((s) => s.categoryId === category.id).length}
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
              Select the skills you need help with and set priority
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {skillCategories
                .find((c) => c.id === activeCategory)
                ?.subskills.map((subskill) => {
                  const selected = isSkillSelected(activeCategory, subskill.id)
                  const skill = requiredSkills.find(
                    (s) => s.categoryId === activeCategory && s.subskillId === subskill.id
                  )
                  return (
                    <div
                      key={subskill.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selected
                          ? "border-secondary bg-secondary/5"
                          : "border-border hover:border-secondary/50"
                      }`}
                      onClick={() => handleSkillToggle(activeCategory, subskill.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{subskill.name}</span>
                        {selected && <CheckCircle className="h-4 w-4 text-secondary" />}
                      </div>
                      {selected && (
                        <div className="mt-2 flex gap-1">
                          <Badge
                            variant={skill?.priority === "must-have" ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSkillPriorityChange(activeCategory, subskill.id, "must-have")
                            }}
                          >
                            Must Have
                          </Badge>
                          <Badge
                            variant={skill?.priority === "nice-to-have" ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSkillPriorityChange(activeCategory, subskill.id, "nice-to-have")
                            }}
                          >
                            Nice to Have
                          </Badge>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {requiredSkills.length > 0 && (
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">
            Selected skills ({requiredSkills.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {requiredSkills.map((skill) => {
              const category = skillCategories.find((c) => c.id === skill.categoryId)
              const subskill = category?.subskills.find((s) => s.id === skill.subskillId)
              return (
                <Badge
                  key={`${skill.categoryId}-${skill.subskillId}`}
                  variant={skill.priority === "must-have" ? "default" : "secondary"}
                >
                  {subskill?.name}
                </Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to JustBecause.asia!</h2>
        <p className="text-muted-foreground">
          Your organization profile is ready. Review and complete setup.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{orgDetails.orgName || "Your Organization"}</h3>
                <p className="text-sm text-muted-foreground">
                  {orgDetails.city}, {orgDetails.country}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">About</h3>
              <p className="text-foreground">
                {orgDetails.description?.slice(0, 150) || "No description provided"}...
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Focus Areas</h3>
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
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">
                Skills Needed ({requiredSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {requiredSkills.slice(0, 6).map((skill) => {
                  const category = skillCategories.find((c) => c.id === skill.categoryId)
                  const subskill = category?.subskills.find((s) => s.id === skill.subskillId)
                  return (
                    <Badge
                      key={`${skill.categoryId}-${skill.subskillId}`}
                      variant={skill.priority === "must-have" ? "default" : "secondary"}
                    >
                      {subskill?.name}
                    </Badge>
                  )
                })}
                {requiredSkills.length > 6 && (
                  <Badge variant="outline">+{requiredSkills.length - 6} more</Badge>
                )}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Team Size</h3>
                <p className="text-foreground">{orgDetails.teamSize || "Not specified"}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Founded</h3>
                <p className="text-foreground">{orgDetails.yearFounded || "Not specified"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-medium">Upload Verification Documents (Optional)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your registration certificate to get verified badge
            </p>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Building2 className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Complete Your Organization Profile</h1>
            <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="mb-8" />

        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
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
            <Button variant="secondary" onClick={() => setStep(step + 1)}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleSubmit} disabled={isLoading}>
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
