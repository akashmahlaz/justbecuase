"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { VolunteerSidebar } from "@/components/dashboard/volunteer-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { authClient } from "@/lib/auth-client"
import { getVolunteerProfile, updateVolunteerProfile, changePassword, deleteAccount } from "@/lib/actions"
import { skillCategories, causes as causesList } from "@/lib/skills-data"
import type { VolunteerSkill, ExperienceLevel } from "@/lib/types"
import { toast } from "sonner"
import { NotificationPermissionButton } from "@/components/notifications/notification-listener"
import {
  User,
  Bell,
  CreditCard,
  Globe,
  Lock,
  Eye,
  Trash2,
  Download,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Sparkles,
  BellRing,
} from "lucide-react"

interface SkillWithName extends VolunteerSkill {
  name?: string
}

interface PrivacySettings {
  showProfile: boolean
  showInSearch: boolean
  emailNotifications: boolean
  applicationNotifications: boolean
  messageNotifications: boolean
  opportunityDigest: boolean
}

export default function VolunteerSettingsPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Skills state
  const [skills, setSkills] = useState<SkillWithName[]>([])
  const [causes, setCauses] = useState<string[]>([])
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkill, setNewSkill] = useState({
    categoryId: "",
    subskillId: "",
    level: "intermediate" as ExperienceLevel,
  })
  
  // Privacy settings state
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    showProfile: true,
    showInSearch: true,
    emailNotifications: true,
    applicationNotifications: true,
    messageNotifications: true,
    opportunityDigest: true,
  })
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [downloadingData, setDownloadingData] = useState(false)
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Fetch profile and privacy settings
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) return
      try {
        const profileData = await getVolunteerProfile()
        if (profileData) {
          setProfile(profileData)
          setSkills(profileData.skills || [])
          setCauses(profileData.causes || [])
        }
        
        // Load privacy settings
        const privacyRes = await fetch('/api/user/privacy')
        if (privacyRes.ok) {
          const data = await privacyRes.json()
          if (data.privacy) {
            setPrivacy(data.privacy)
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err)
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

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccess(message)
      setError(null)
    } else {
      setError(message)
      setSuccess(null)
    }
    setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 5000)
  }

  // Skills management
  const addSkill = () => {
    if (!newSkill.categoryId || !newSkill.subskillId) return
    
    const exists = skills.some(
      (s) => s.categoryId === newSkill.categoryId && s.subskillId === newSkill.subskillId
    )
    if (exists) {
      showNotification("error", "This skill is already added")
      return
    }

    const category = skillCategories.find((c) => c.id === newSkill.categoryId)
    const subskill = category?.subskills.find((s) => s.id === newSkill.subskillId)

    setSkills([...skills, { ...newSkill, name: subskill?.name }])
    setNewSkill({ categoryId: "", subskillId: "", level: "intermediate" })
    setAddingSkill(false)
  }

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

  const toggleCause = (cause: string) => {
    if (causes.includes(cause)) {
      setCauses(causes.filter((c) => c !== cause))
    } else {
      setCauses([...causes, cause])
    }
  }

  const saveSkillsAndCauses = async () => {
    setIsSaving(true)
    try {
      const result = await updateVolunteerProfile({
        skills: skills.map((s) => ({
          categoryId: s.categoryId,
          subskillId: s.subskillId,
          level: s.level,
        })),
        causes,
      })
      if (result.success) {
        showNotification("success", "Skills and causes updated successfully")
      } else {
        showNotification("error", result.error || "Failed to update")
      }
    } catch (err) {
      showNotification("error", "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  // Password change
  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification("error", "Passwords do not match")
      return
    }
    if (passwordData.newPassword.length < 8) {
      showNotification("error", "Password must be at least 8 characters")
      return
    }

    setChangingPassword(true)
    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword)
      if (result.success) {
        showNotification("success", "Password changed successfully")
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        showNotification("error", result.error || "Failed to change password May be Due to you have created account via social login")
      }
    } catch (err) {
      showNotification("error", "An error occurred")
    } finally {
      setChangingPassword(false)
    }
  }

  // Save privacy settings
  const handleSavePrivacy = async () => {
    setSavingPrivacy(true)
    try {
      const res = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy }),
      })
      if (res.ok) {
        toast.success("Privacy settings saved")
      } else {
        toast.error("Failed to save privacy settings")
      }
    } catch (err) {
      toast.error("An error occurred")
    } finally {
      setSavingPrivacy(false)
    }
  }

  // Download user data
  const handleDownloadData = async () => {
    setDownloadingData(true)
    try {
      const res = await fetch('/api/user/export-data')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `justbecause-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("Data downloaded successfully")
      } else {
        toast.error("Failed to download data")
      }
    } catch (err) {
      toast.error("An error occurred")
    } finally {
      setDownloadingData(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      showNotification("error", "Please type DELETE to confirm")
      return
    }

    setDeleting(true)
    try {
      const result = await deleteAccount()
      if (result.success) {
        await authClient.signOut()
        router.push("/")
      } else {
        showNotification("error", result.error || "Failed to delete account")
      }
    } catch (err) {
      showNotification("error", "An error occurred")
    } finally {
      setDeleting(false)
    }
  }

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session?.user) return null

  const selectedCategory = skillCategories.find((c) => c.id === newSkill.categoryId)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userType="volunteer"
        userName={profile?.name || session.user.name || "Volunteer"}
        userAvatar={profile?.avatar || session.user.image || undefined}
      />

      <div className="flex">
        <VolunteerSidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account, skills, and preferences
            </p>
          </div>

          {/* Notifications */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <Tabs defaultValue="skills" className="space-y-6">
            <TabsList className="grid w-full max-w-xl grid-cols-5">
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="notifications">Alerts</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            {/* Skills Settings */}
            <TabsContent value="skills">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Your Skills
                    </CardTitle>
                    <CardDescription>
                      Add or remove skills that NGOs can match you with
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Skills */}
                    <div className="space-y-3">
                      {skills.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center">
                          No skills added yet. Add skills to get matched with projects.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, index) => {
                            const category = skillCategories.find((c) => c.id === skill.categoryId)
                            const subskill = category?.subskills.find((s) => s.id === skill.subskillId)
                            return (
                              <Badge
                                key={index}
                                className="py-2 px-3 flex items-center gap-2"
                              >
                                <span>{skill.name || subskill?.name || skill.subskillId}</span>
                                <span className="text-xs opacity-75">({skill.level})</span>
                                <button
                                  onClick={() => removeSkill(index)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add Skill Form */}
                    {addingSkill ? (
                      <div className="p-4 border rounded-lg space-y-4">
                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={newSkill.categoryId}
                              onValueChange={(value) =>
                                setNewSkill({ ...newSkill, categoryId: value, subskillId: "" })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {skillCategories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Skill</Label>
                            <Select
                              value={newSkill.subskillId}
                              onValueChange={(value) =>
                                setNewSkill({ ...newSkill, subskillId: value })
                              }
                              disabled={!newSkill.categoryId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select skill" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedCategory?.subskills.map((sub) => (
                                  <SelectItem key={sub.id} value={sub.id}>
                                    {sub.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Level</Label>
                            <Select
                              value={newSkill.level}
                              onValueChange={(value: ExperienceLevel) =>
                                setNewSkill({ ...newSkill, level: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={addSkill} size="sm">
                            Add Skill
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddingSkill(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setAddingSkill(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Skill
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Causes You Care About</CardTitle>
                    <CardDescription>
                      Select causes to get matched with relevant projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {causesList.map((cause) => (
                        <Badge
                          key={cause.id}
                          variant={causes.includes(cause.id) ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            causes.includes(cause.id)
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-primary/10"
                          }`}
                          onClick={() => toggleCause(cause.id)}
                        >
                          {cause.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={saveSkillsAndCauses} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Skills & Causes
                </Button>
              </div>
            </TabsContent>

            {/* Account Settings */}
            <TabsContent value="account">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Full Name</Label>
                        <Input
                          value={profile?.name || session.user.name || ""}
                          disabled
                          className="mt-1.5 bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Edit in your profile settings
                        </p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={session.user.email || ""}
                          disabled
                          className="mt-1.5 bg-muted"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, newPassword: e.target.value })
                          }
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                          }
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <Button onClick={handlePasswordChange} disabled={changingPassword}>
                      {changingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Update Password
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Connected Accounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4285F4] rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">G</span>
                        </div>
                        <div>
                          <p className="font-medium">Google</p>
                          <p className="text-sm text-muted-foreground">
                            {session.user.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Connected</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BellRing className="h-5 w-5" />
                      Browser Notifications
                    </CardTitle>
                    <CardDescription>
                      Get instant notifications in your browser when something important happens
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <NotificationPermissionButton />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-4">Email Notifications</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Application Updates</p>
                            <p className="text-sm text-muted-foreground">
                              Get notified when NGOs respond to your applications
                            </p>
                          </div>
                          <Switch
                            checked={privacy.applicationNotifications}
                            onCheckedChange={(checked) => 
                              setPrivacy({ ...privacy, applicationNotifications: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">New Messages</p>
                            <p className="text-sm text-muted-foreground">
                              Receive emails for new messages from NGOs
                            </p>
                          </div>
                          <Switch
                            checked={privacy.messageNotifications}
                            onCheckedChange={(checked) => 
                              setPrivacy({ ...privacy, messageNotifications: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Opportunity Recommendations</p>
                            <p className="text-sm text-muted-foreground">
                              Weekly digest of opportunities matching your skills
                            </p>
                          </div>
                          <Switch
                            checked={privacy.opportunityDigest}
                            onCheckedChange={(checked) => 
                              setPrivacy({ ...privacy, opportunityDigest: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleSavePrivacy} disabled={savingPrivacy}>
                      {savingPrivacy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Profile Visibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Profile Status</p>
                        <p className="text-sm text-muted-foreground">
                          Make your profile visible to NGOs
                        </p>
                      </div>
                      <Switch
                        checked={privacy.showProfile}
                        onCheckedChange={(checked) => 
                          setPrivacy({ ...privacy, showProfile: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show in Search Results</p>
                        <p className="text-sm text-muted-foreground">
                          Allow your profile to appear in volunteer searches
                        </p>
                      </div>
                      <Switch
                        checked={privacy.showInSearch}
                        onCheckedChange={(checked) => 
                          setPrivacy({ ...privacy, showInSearch: checked })
                        }
                      />
                    </div>
                    <Button onClick={handleSavePrivacy} disabled={savingPrivacy}>
                      {savingPrivacy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Privacy Settings
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Data & Privacy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Download Your Data</p>
                        <p className="text-sm text-muted-foreground">
                          Get a copy of your profile and activity data
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleDownloadData}
                        disabled={downloadingData}
                      >
                        {downloadingData && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {downloadingData ? "Preparing..." : "Download Data"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <Trash2 className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!showDeleteConfirm ? (
                      <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950">
                        <div>
                          <p className="font-medium text-red-600">Delete Account</p>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all associated data
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          Delete Account
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 space-y-4">
                        <p className="text-red-600 font-medium">
                          Are you sure? This action cannot be undone.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Type <strong>DELETE</strong> to confirm:
                        </p>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Type DELETE"
                          className="max-w-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={deleting || deleteConfirmText !== "DELETE"}
                          >
                            {deleting ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Confirm Delete
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDeleteConfirm(false)
                              setDeleteConfirmText("")
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Billing Settings */}
            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-lg">
                          {profile?.volunteerType === "paid" ? "Paid Volunteer" : "Free Volunteer"}
                        </p>
                        <Badge
                          variant={profile?.volunteerType === "paid" ? "default" : "secondary"}
                        >
                          {profile?.volunteerType === "paid" ? "Pro" : "Free"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {profile?.volunteerType === "paid"
                          ? "Your profile is fully visible to all NGOs"
                          : "NGOs need to unlock your profile to see full details"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
