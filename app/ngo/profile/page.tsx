"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NGOSidebar } from "@/components/dashboard/ngo-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Save, Loader2, CheckCircle, Building2, Globe, Users, ExternalLink } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getNGOProfile, updateNGOProfile } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import type { NGOProfile } from "@/lib/types"

const teamSizes = [
  "1-5",
  "6-10",
  "11-25",
  "26-50",
  "51-100",
  "100+",
]

const causes = [
  "Education",
  "Healthcare",
  "Environment",
  "Poverty Alleviation",
  "Women Empowerment",
  "Child Welfare",
  "Animal Welfare",
  "Disaster Relief",
  "Community Development",
  "Arts & Culture",
  "Human Rights",
  "Technology for Good",
]

export default function NGOProfilePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<NGOProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [formData, setFormData] = useState({
    orgName: "",
    description: "",
    mission: "",
    website: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    contactPersonName: "",
    contactEmail: "",
    yearFounded: "",
    teamSize: "",
    registrationNumber: "",
    socialLinks: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
    },
  })

  const [selectedCauses, setSelectedCauses] = useState<string[]>([])

  // Fetch profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      
      try {
        const profileData = await getNGOProfile()
        if (profileData) {
          setProfile(profileData)
          setFormData({
            orgName: profileData.orgName || "",
            description: profileData.description || "",
            mission: profileData.mission || "",
            website: profileData.website || "",
            phone: profileData.phone || "",
            address: profileData.address || "",
            city: profileData.city || "",
            country: profileData.country || "",
            contactPersonName: profileData.contactPersonName || "",
            contactEmail: profileData.contactEmail || "",
            yearFounded: profileData.yearFounded || "",
            teamSize: profileData.teamSize || "",
            registrationNumber: profileData.registrationNumber || "",
            socialLinks: {
              facebook: profileData.socialLinks?.facebook || "",
              twitter: profileData.socialLinks?.twitter || "",
              instagram: profileData.socialLinks?.instagram || "",
              linkedin: profileData.socialLinks?.linkedin || "",
            },
          })
          setSelectedCauses(profileData.causes || [])
        }
      } catch (err) {
        console.error("Failed to load profile:", err)
        setError("Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading && user) {
      loadProfile()
    } else if (!authLoading && !user) {
      router.push("/auth/signin")
    }
  }, [user, authLoading, router])

  // Calculate profile completion
  const calculateCompletion = () => {
    let completion = 20 // Base for having account
    if (formData.orgName) completion += 10
    if (formData.description && formData.description.length > 50) completion += 15
    if (formData.mission && formData.mission.length > 30) completion += 10
    if (formData.website) completion += 10
    if (formData.phone) completion += 5
    if (formData.address && formData.city) completion += 10
    if (selectedCauses.length > 0) completion += 10
    if (profile?.logo) completion += 10
    return Math.min(completion, 100)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be less than 2MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    setUploadingLogo(true)
    setError("")

    try {
      const uploadData = new FormData()
      uploadData.append("file", file)
      uploadData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ngo_logos")

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`
      
      const response = await fetch(cloudinaryUrl, {
        method: "POST",
        body: uploadData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      
      const result = await updateNGOProfile({ logo: data.secure_url })
      
      if (result.success) {
        setProfile((prev) => prev ? { ...prev, logo: data.secure_url } : null)
      } else {
        throw new Error(result.error || "Failed to save logo")
      }
    } catch (err) {
      console.error("Logo upload error:", err)
      setError("Failed to upload logo. Please try again.")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError("")
    setIsSaved(false)

    try {
      const result = await updateNGOProfile({
        ...formData,
        causes: selectedCauses,
      })

      if (result.success) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        setError(result.error || "Failed to save profile")
      }
    } catch (err) {
      console.error("Save error:", err)
      setError("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleCause = (cause: string) => {
    setSelectedCauses((prev) =>
      prev.includes(cause) ? prev.filter((c) => c !== cause) : [...prev, cause]
    )
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const completion = calculateCompletion()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        userType="ngo" 
        userName={formData.orgName || user?.name || "NGO"}
      />

      <div className="flex">
        <NGOSidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Organization Profile</h1>
            <p className="text-muted-foreground">
              Manage your organization&apos;s public profile and details
            </p>
          </div>

          {/* Profile Completion */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Profile Completion</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete your profile to attract more volunteers
                  </p>
                </div>
                <span className="text-2xl font-bold text-primary">{completion}%</span>
              </div>
              <Progress value={completion} className="h-2" />
            </CardContent>
          </Card>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          )}

          {isSaved && (
            <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Profile saved successfully!
            </div>
          )}

          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Organization Details</TabsTrigger>
              <TabsTrigger value="causes">Causes & Focus</TabsTrigger>
              <TabsTrigger value="skills">Skills Needed</TabsTrigger>
              <TabsTrigger value="social">Social Links</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Logo</CardTitle>
                  <CardDescription>
                    Upload your organization&apos;s logo (max 2MB)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                        {profile?.logo ? (
                          <img
                            src={profile.logo}
                            alt="Organization logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                        <Camera className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 
                          ? "Click the camera icon to upload your logo"
                          : "Logo upload requires Cloudinary configuration"}
                      </p>
                      {uploadingLogo && (
                        <p className="text-sm text-primary flex items-center gap-2 mt-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        value={formData.orgName}
                        onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                        placeholder="Your organization name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">Registration Number</Label>
                      <Input
                        id="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                        placeholder="e.g., 80G/12A number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">About Organization *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Tell volunteers about your organization, what you do, and your impact..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mission">Mission Statement</Label>
                    <Textarea
                      id="mission"
                      value={formData.mission}
                      onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                      placeholder="Your organization's mission..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organization Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPersonName">Contact Person</Label>
                      <Input
                        id="contactPersonName"
                        value={formData.contactPersonName}
                        onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                        placeholder="Primary contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder="contact@organization.org"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://www.yourorg.org"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location & Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address"
                      rows={2}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yearFounded">Year Founded</Label>
                      <Input
                        id="yearFounded"
                        value={formData.yearFounded}
                        onChange={(e) => setFormData({ ...formData, yearFounded: e.target.value })}
                        placeholder="e.g., 2010"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamSize">Team Size</Label>
                      <Select
                        value={formData.teamSize}
                        onValueChange={(value) => setFormData({ ...formData, teamSize: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team size" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamSizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size} people
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Causes Tab */}
            <TabsContent value="causes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Focus Areas</CardTitle>
                  <CardDescription>
                    Select the causes your organization focuses on
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {causes.map((cause) => (
                      <Badge
                        key={cause}
                        variant={selectedCauses.includes(cause) ? "default" : "outline"}
                        className="cursor-pointer text-sm py-2 px-4"
                        onClick={() => toggleCause(cause)}
                      >
                        {cause}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Selected: {selectedCauses.length} cause{selectedCauses.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills Needed Tab */}
            <TabsContent value="skills" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skills You Typically Need</CardTitle>
                  <CardDescription>
                    These skills were set during onboarding and help match you with volunteers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Label>Your Required Skills</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile?.typicalSkillsNeeded && profile.typicalSkillsNeeded.length > 0 ? (
                        profile.typicalSkillsNeeded.map((skill: any, index: number) => {
                          const category = skillCategories.find((c: any) => c.id === skill.categoryId)
                          const subskill = category?.subskills.find((s: any) => s.id === skill.subskillId)
                          return (
                            <Badge 
                              key={index} 
                              className={skill.priority === "must-have" 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-secondary text-secondary-foreground"}
                            >
                              {subskill?.name || skill.subskillId}
                              {skill.priority === "must-have" && " (Must-have)"}
                            </Badge>
                          )
                        })
                      ) : (
                        <p className="text-muted-foreground">No skills specified yet. Complete onboarding to add skills.</p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      To update your required skills, please go to Settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Social Links Tab */}
            <TabsContent value="social" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Links</CardTitle>
                  <CardDescription>
                    Add your organization&apos;s social media profiles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        value={formData.socialLinks.facebook}
                        onChange={(e) => setFormData({
                          ...formData,
                          socialLinks: { ...formData.socialLinks, facebook: e.target.value }
                        })}
                        placeholder="https://facebook.com/yourorg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter / X</Label>
                      <Input
                        id="twitter"
                        value={formData.socialLinks.twitter}
                        onChange={(e) => setFormData({
                          ...formData,
                          socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                        })}
                        placeholder="https://twitter.com/yourorg"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        value={formData.socialLinks.instagram}
                        onChange={(e) => setFormData({
                          ...formData,
                          socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                        })}
                        placeholder="https://instagram.com/yourorg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        value={formData.socialLinks.linkedin}
                        onChange={(e) => setFormData({
                          ...formData,
                          socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                        })}
                        placeholder="https://linkedin.com/company/yourorg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} size="lg">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
