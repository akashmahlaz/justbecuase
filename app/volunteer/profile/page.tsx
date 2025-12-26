"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { VolunteerSidebar } from "@/components/dashboard/volunteer-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Save, Loader2, CheckCircle, MapPin, LocateFixed } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { getVolunteerProfile, updateVolunteerProfile } from "@/lib/actions"
import { skillCategories } from "@/lib/skills-data"
import { uploadToCloudinary, validateImageFile } from "@/lib/upload"

export default function VolunteerProfileEditPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState("")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
    phone: "",
    linkedinUrl: "",
    portfolioUrl: "",
    hoursPerWeek: "5-10",
  })

  // Get location using browser geolocation + Google Geocoding
  const getGoogleLocation = async () => {
    setIsGettingLocation(true)
    setError("")
    
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      setIsGettingLocation(false)
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          const response = await fetch('/api/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          })
          
          const data = await response.json()
          
          if (data.success && data.location) {
            const { city, state, country } = data.location
            const locationParts = [city, state, country].filter(Boolean)
            
            if (locationParts.length > 0) {
              setFormData(prev => ({ ...prev, location: locationParts.join(", ") }))
              toast.success("Location updated!")
            } else {
              setError("Could not determine location details")
            }
          } else {
            setError(data.error || "Failed to get location details")
          }
        } catch (err) {
          console.error('Geocoding error:', err)
          setError("Failed to get location details")
        } finally {
          setIsGettingLocation(false)
        }
      },
      (error) => {
        let errorMessage = "Unable to get your location."
        if (error.code === 1) errorMessage = "Location permission denied."
        else if (error.code === 2) errorMessage = "Location unavailable."
        else if (error.code === 3) errorMessage = "Location request timed out."
        setError(errorMessage)
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  // Fetch profile data
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) return
      
      try {
        const profileData = await getVolunteerProfile()
        if (profileData) {
          setProfile(profileData)
          setFormData({
            name: profileData.name || session.user.name || "",
            bio: profileData.bio || "",
            location: profileData.location || "",
            phone: profileData.phone || "",
            linkedinUrl: profileData.linkedinUrl || "",
            portfolioUrl: profileData.portfolioUrl || "",
            hoursPerWeek: profileData.hoursPerWeek || "5-10",
          })
        }
      } catch (err) {
        console.error("Failed to load profile:", err)
        setError("Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    if (!isPending && session?.user) {
      loadProfile()
    } else if (!isPending && !session?.user) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  // Calculate profile completion
  const calculateCompletion = () => {
    let completion = 20 // Base for having account
    if (formData.phone) completion += 10
    if (formData.location) completion += 10
    if (formData.bio && formData.bio.length > 50) completion += 20
    if (profile?.skills?.length > 0) completion += 20
    if (profile?.causes?.length > 0) completion += 10
    if (formData.linkedinUrl || formData.portfolioUrl) completion += 10
    return Math.min(completion, 100)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error("Invalid file", { description: validation.error })
      return
    }

    setUploadingPhoto(true)
    toast.loading("Uploading photo...", { id: "photo-upload" })

    try {
      // Upload with signed request
      const uploadResult = await uploadToCloudinary(file, "volunteer_avatars", {
        onProgress: (percent) => {
          // Could show progress here if needed
        },
      })

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed")
      }

      // Update profile with new avatar URL
      const result = await updateVolunteerProfile({ avatar: uploadResult.url })
      
      if (result.success) {
        setProfile((prev: any) => ({ ...prev, avatar: uploadResult.url }))
        toast.success("Photo updated!", { id: "photo-upload" })
      } else {
        throw new Error(result.error || "Failed to save avatar")
      }
    } catch (err: any) {
      console.error("Photo upload error:", err)
      toast.error("Upload failed", { 
        id: "photo-upload",
        description: err.message || "Please try again."
      })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")

    try {
      const result = await updateVolunteerProfile({
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        phone: formData.phone,
        linkedinUrl: formData.linkedinUrl,
        portfolioUrl: formData.portfolioUrl,
        hoursPerWeek: formData.hoursPerWeek,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to save profile")
      }

      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const profileCompletion = calculateCompletion()
  const userName = formData.name || session.user.name || "Volunteer"
  const userAvatar = profile?.avatar || session.user.image || undefined

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userType="volunteer" userName={userName} userAvatar={userAvatar} />

      <div className="flex">
        <VolunteerSidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Edit Profile</h1>
                <p className="text-muted-foreground">Update your information to help NGOs find you</p>
              </div>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href={`/volunteers/${session.user.id}`}>View Public Profile</Link>
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Profile Completion */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Profile Completion</span>
                  <span className="text-sm font-medium text-primary">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Complete your profile to increase your chances of being matched with projects.
                </p>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="skills">Skills & Experience</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>Your personal details and bio</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Avatar */}
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <img
                            src={userAvatar || "/placeholder.svg?height=96&width=96"}
                            alt={userName}
                            className="w-24 h-24 rounded-full object-cover"
                          />
                          <label
                            htmlFor="avatar-upload"
                            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 cursor-pointer"
                          >
                            {uploadingPhoto ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4" />
                            )}
                          </label>
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Profile Photo</p>
                          <p className="text-sm text-muted-foreground">JPG or PNG. Max 5MB.</p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="location"
                              value={formData.location}
                              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                              placeholder="City, State, Country"
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
                                Update Location
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your location helps match you with nearby opportunities
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                          placeholder="Tell NGOs about yourself, your experience, and why you volunteer..."
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="linkedin">LinkedIn URL</Label>
                          <Input
                            id="linkedin"
                            type="url"
                            value={formData.linkedinUrl}
                            onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                            placeholder="https://linkedin.com/in/yourprofile"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="portfolio">Portfolio URL</Label>
                          <Input
                            id="portfolio"
                            type="url"
                            value={formData.portfolioUrl}
                            onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                            placeholder="https://yourportfolio.com"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="skills">
                  <Card>
                    <CardHeader>
                      <CardTitle>Skills & Expertise</CardTitle>
                      <CardDescription>Your skills were set during onboarding.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Label>Your Current Skills</Label>
                        <div className="flex flex-wrap gap-2">
                          {profile?.skills?.length > 0 ? (
                            profile.skills.map((skill: any, index: number) => {
                              const category = skillCategories.find((c: any) => c.id === skill.categoryId)
                              const subskill = category?.subskills.find((s: any) => s.id === skill.subskillId)
                              return (
                                <Badge key={index} className="bg-primary text-primary-foreground">
                                  {subskill?.name || skill.subskillId} ({skill.level})
                                </Badge>
                              )
                            })
                          ) : (
                            <p className="text-muted-foreground">No skills added yet. Complete onboarding to add skills.</p>
                          )}
                        </div>
                        <Button variant="outline" asChild className="mt-4">
                          <Link href="/volunteer/settings">Manage Skills in Settings</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preferences">
                  <Card>
                    <CardHeader>
                      <CardTitle>Volunteering Preferences</CardTitle>
                      <CardDescription>Set your availability and preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="availability">Weekly Availability</Label>
                        <Select
                          value={formData.hoursPerWeek}
                          onValueChange={(value) => setFormData({ ...formData, hoursPerWeek: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-5">1-5 hours per week</SelectItem>
                            <SelectItem value="5-10">5-10 hours per week</SelectItem>
                            <SelectItem value="10-20">10-20 hours per week</SelectItem>
                            <SelectItem value="20+">20+ hours per week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Your Causes</Label>
                        <div className="flex flex-wrap gap-2">
                          {profile?.causes?.length > 0 ? (
                            profile.causes.map((cause: string) => (
                              <Badge key={cause} variant="secondary">
                                {cause}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-muted-foreground">No causes selected.</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Work Mode</Label>
                        <Badge variant="secondary" className="capitalize">
                          {profile?.workMode || "Not set"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <Label>Volunteer Type</Label>
                        <Badge variant="secondary" className="capitalize">
                          {profile?.volunteerType === "free" ? "Pro-Bono Only" : 
                           profile?.volunteerType === "paid" ? "Paid Only" : 
                           profile?.volunteerType === "both" ? "Open to Both" : "Not set"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Save Button */}
              <div className="flex justify-end mt-8">
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : isSaved ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
