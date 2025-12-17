"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  Globe,
  CreditCard,
  Shield,
  Save,
  Loader2,
  Users,
  Building2,
  Plus,
  X,
} from "lucide-react"
import { getAdminSettings, updateAdminSettings } from "@/lib/actions"
import { toast } from "sonner"
import type { AdminSettings, SupportedCurrency } from "@/lib/types"

const CURRENCIES: { value: SupportedCurrency; label: string; symbol: string }[] = [
  { value: "INR", label: "Indian Rupee (INR)", symbol: "₹" },
  { value: "USD", label: "US Dollar (USD)", symbol: "$" },
  { value: "EUR", label: "Euro (EUR)", symbol: "€" },
  { value: "GBP", label: "British Pound (GBP)", symbol: "£" },
  { value: "SGD", label: "Singapore Dollar (SGD)", symbol: "S$" },
  { value: "AED", label: "UAE Dirham (AED)", symbol: "د.إ" },
  { value: "MYR", label: "Malaysian Ringgit (MYR)", symbol: "RM" },
]

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newVolunteerFeature, setNewVolunteerFeature] = useState("")
  const [newNGOFeature, setNewNGOFeature] = useState("")

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    const data = await getAdminSettings()
    setSettings(data)
    setIsLoading(false)
  }

  const handleSave = async () => {
    if (!settings) return
    setIsSaving(true)
    const result = await updateAdminSettings(settings)
    if (result.success) {
      toast.success("Settings saved successfully")
    } else {
      toast.error(result.error || "Failed to save settings")
    }
    setIsSaving(false)
  }

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.value === settings?.currency)
    return curr?.symbol || "₹"
  }

  const addVolunteerFeature = () => {
    if (!newVolunteerFeature.trim() || !settings) return
    setSettings({
      ...settings,
      volunteerProFeatures: [...(settings.volunteerProFeatures || []), newVolunteerFeature.trim()],
    })
    setNewVolunteerFeature("")
  }

  const removeVolunteerFeature = (index: number) => {
    if (!settings) return
    setSettings({
      ...settings,
      volunteerProFeatures: settings.volunteerProFeatures?.filter((_, i) => i !== index) || [],
    })
  }

  const addNGOFeature = () => {
    if (!newNGOFeature.trim() || !settings) return
    setSettings({
      ...settings,
      ngoProFeatures: [...(settings.ngoProFeatures || []), newNGOFeature.trim()],
    })
    setNewNGOFeature("")
  }

  const removeNGOFeature = (index: number) => {
    if (!settings) return
    setSettings({
      ...settings,
      ngoProFeatures: settings.ngoProFeatures?.filter((_, i) => i !== index) || [],
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load settings</p>
        <Button onClick={loadSettings} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure all platform settings, pricing, and subscription plans
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="volunteer-plans" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Volunteer Plans
          </TabsTrigger>
          <TabsTrigger value="ngo-plans" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            NGO Plans
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Information</CardTitle>
              <CardDescription>
                Basic information about your platform displayed across the site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={settings.platformName}
                    onChange={(e) =>
                      setSettings({ ...settings, platformName: e.target.value })
                    }
                    placeholder="JustBecause.Asia"
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed in navbar, emails, and meta tags
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, supportEmail: e.target.value })
                    }
                    placeholder="support@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="platformDescription">Platform Description</Label>
                <Textarea
                  id="platformDescription"
                  value={settings.platformDescription}
                  onChange={(e) =>
                    setSettings({ ...settings, platformDescription: e.target.value })
                  }
                  rows={3}
                  placeholder="Connecting NGOs with skilled volunteers..."
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platformLogo">Logo URL</Label>
                  <Input
                    id="platformLogo"
                    value={settings.platformLogo || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, platformLogo: e.target.value })
                    }
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platformFavicon">Favicon URL</Label>
                  <Input
                    id="platformFavicon"
                    value={settings.platformFavicon || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, platformFavicon: e.target.value })
                    }
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Search engine optimization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={settings.metaTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, metaTitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={settings.metaDescription}
                  onChange={(e) =>
                    setSettings({ ...settings, metaDescription: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Social media links displayed in the footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={settings.socialLinks?.facebook || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socialLinks: { ...settings.socialLinks, facebook: e.target.value },
                      })
                    }
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter/X</Label>
                  <Input
                    id="twitter"
                    value={settings.socialLinks?.twitter || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socialLinks: { ...settings.socialLinks, twitter: e.target.value },
                      })
                    }
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={settings.socialLinks?.instagram || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socialLinks: { ...settings.socialLinks, instagram: e.target.value },
                      })
                    }
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={settings.socialLinks?.linkedin || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socialLinks: { ...settings.socialLinks, linkedin: e.target.value },
                      })
                    }
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>
                Put the site in maintenance mode when needed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Users will see a maintenance message instead of the site
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, maintenanceMode: checked })
                  }
                />
              </div>
              {settings.maintenanceMode && (
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                  <Textarea
                    id="maintenanceMessage"
                    value={settings.maintenanceMessage || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, maintenanceMessage: e.target.value })
                    }
                    placeholder="We're currently performing scheduled maintenance..."
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency & Payment Gateway</CardTitle>
              <CardDescription>
                Configure your payment currency and Razorpay settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value: SupportedCurrency) =>
                      setSettings({ ...settings, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr.value} value={curr.value}>
                          {curr.symbol} - {curr.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All prices will be displayed in this currency
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razorpayKey">Razorpay Key ID (Public)</Label>
                  <Input
                    id="razorpayKey"
                    value={settings.razorpayKeyId || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, razorpayKeyId: e.target.value })
                    }
                    placeholder="rzp_live_..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Razorpay public key (starts with rzp_)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Unlock Pricing</CardTitle>
              <CardDescription>
                Set the price for NGOs to unlock free volunteer profiles (pay-per-unlock)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unlockPrice">Single Profile Unlock Price</Label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {getCurrencySymbol()}
                  </span>
                  <Input
                    id="unlockPrice"
                    type="number"
                    className="pl-8"
                    value={settings.singleProfileUnlockPrice}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        singleProfileUnlockPrice: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This is what NGOs pay to unlock a single volunteer profile (free tier NGOs)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Volunteer Plans */}
        <TabsContent value="volunteer-plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">Free Plan</Badge>
                Volunteer Free Plan Limits
              </CardTitle>
              <CardDescription>
                Configure limits for volunteers on the free plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="volunteerFreeApps">Applications per Month</Label>
                  <Input
                    id="volunteerFreeApps"
                    type="number"
                    value={settings.volunteerFreeApplicationsPerMonth || 3}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        volunteerFreeApplicationsPerMonth: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of project applications allowed per month
                  </p>
                </div>
                <div className="space-y-2 flex items-center gap-4 pt-6">
                  <Switch
                    checked={settings.volunteerFreeProfileVisibility !== false}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, volunteerFreeProfileVisibility: checked })
                    }
                  />
                  <div>
                    <Label>Profile Visibility</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow free plan volunteers to be visible in search
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-primary">Pro Plan</Badge>
                Volunteer Pro Plan
              </CardTitle>
              <CardDescription>
                Configure pricing and features for the volunteer pro plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="volunteerProPrice">Monthly Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {getCurrencySymbol()}
                  </span>
                  <Input
                    id="volunteerProPrice"
                    type="number"
                    className="pl-8"
                    value={settings.volunteerProPrice || 999}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        volunteerProPrice: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Pro Plan Features</Label>
                <p className="text-sm text-muted-foreground">
                  These features are displayed on the pricing page
                </p>
                <div className="space-y-2">
                  {settings.volunteerProFeatures?.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...(settings.volunteerProFeatures || [])]
                          newFeatures[index] = e.target.value
                          setSettings({ ...settings, volunteerProFeatures: newFeatures })
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVolunteerFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newVolunteerFeature}
                    onChange={(e) => setNewVolunteerFeature(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyDown={(e) => e.key === "Enter" && addVolunteerFeature()}
                  />
                  <Button variant="outline" onClick={addVolunteerFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NGO Plans */}
        <TabsContent value="ngo-plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">Free Plan</Badge>
                NGO Free Plan Limits
              </CardTitle>
              <CardDescription>
                Configure limits for NGOs on the free plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ngoFreeProjects">Projects per Month</Label>
                  <Input
                    id="ngoFreeProjects"
                    type="number"
                    value={settings.ngoFreeProjectsPerMonth || 3}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ngoFreeProjectsPerMonth: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of projects NGOs can post per month
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ngoFreeUnlocks">Profile Unlocks per Month</Label>
                  <Input
                    id="ngoFreeUnlocks"
                    type="number"
                    value={settings.ngoFreeProfileUnlocksPerMonth || 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ngoFreeProfileUnlocksPerMonth: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Free profile unlocks (0 = pay-per-unlock only)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-primary">Pro Plan</Badge>
                NGO Pro Plan
              </CardTitle>
              <CardDescription>
                Configure pricing and features for the NGO pro plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ngoProPrice">Monthly Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol()}
                    </span>
                    <Input
                      id="ngoProPrice"
                      type="number"
                      className="pl-8"
                      value={settings.ngoProPrice || 2999}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ngoProPrice: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2 flex items-center gap-2 pt-6">
                  <Switch
                    checked={settings.ngoProProjectsUnlimited !== false}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, ngoProProjectsUnlimited: checked })
                    }
                  />
                  <Label>Unlimited Projects</Label>
                </div>
                <div className="space-y-2 flex items-center gap-2 pt-6">
                  <Switch
                    checked={settings.ngoProUnlocksUnlimited !== false}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, ngoProUnlocksUnlimited: checked })
                    }
                  />
                  <Label>Unlimited Unlocks</Label>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Pro Plan Features</Label>
                <p className="text-sm text-muted-foreground">
                  These features are displayed on the pricing page
                </p>
                <div className="space-y-2">
                  {settings.ngoProFeatures?.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...(settings.ngoProFeatures || [])]
                          newFeatures[index] = e.target.value
                          setSettings({ ...settings, ngoProFeatures: newFeatures })
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNGOFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newNGOFeature}
                    onChange={(e) => setNewNGOFeature(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyDown={(e) => e.key === "Enter" && addNGOFeature()}
                  />
                  <Button variant="outline" onClick={addNGOFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Toggle */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>
                Enable or disable platform features globally
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payments</p>
                  <p className="text-sm text-muted-foreground">
                    Enable payment processing for subscriptions and profile unlocks
                  </p>
                </div>
                <Switch
                  checked={settings.enablePayments}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enablePayments: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Messaging</p>
                  <p className="text-sm text-muted-foreground">
                    Allow users to send messages to each other
                  </p>
                </div>
                <Switch
                  checked={settings.enableMessaging}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableMessaging: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Send email and in-app notifications to users
                  </p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableNotifications: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification Requirements</CardTitle>
              <CardDescription>
                Set verification requirements for users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Verification</p>
                  <p className="text-sm text-muted-foreground">
                    Require users to verify their email address before using the platform
                  </p>
                </div>
                <Switch
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, requireEmailVerification: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">NGO Verification</p>
                  <p className="text-sm text-muted-foreground">
                    Require NGOs to be verified by admin before they can post projects
                  </p>
                </div>
                <Switch
                  checked={settings.requireNGOVerification}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, requireNGOVerification: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
