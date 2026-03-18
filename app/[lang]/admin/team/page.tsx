"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useDictionary } from "@/components/dictionary-provider"
import { AdminTableSkeleton } from "@/components/ui/page-skeletons"
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "@/lib/actions"
import { uploadToCloudinary, validateImageFile } from "@/lib/upload"
import {
  Plus,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  Linkedin,
  Twitter,
  User,
  Upload,
  X,
  Mail,
} from "lucide-react"
import type { TeamMember } from "@/lib/types"

export default function AdminTeamPage() {
  const dict = useDictionary();
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)

  // Photo upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    bio: "",
    avatar: "",
    linkedinUrl: "",
    twitterUrl: "",
    isActive: true,
  })

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    setLoading(true)
    const result = await getTeamMembers()
    if (result.success && result.data) {
      setMembers(result.data)
    } else {
      toast.error(dict.admin?.team?.toasts?.failedToLoad || "Failed to load team members")
    }
    setLoading(false)
  }

  function openCreateDialog() {
    setEditingMember(null)
    setFormData({
      name: "",
      email: "",
      role: "",
      bio: "",
      avatar: "",
      linkedinUrl: "",
      twitterUrl: "",
      isActive: true,
    })
    setAvatarFile(null)
    setAvatarPreview("")
    setUploadProgress(0)
    setShowDialog(true)
  }

  function openEditDialog(member: TeamMember) {
    setEditingMember(member)
    setFormData({
      name: member.name,
      email: member.email || "",
      role: member.role,
      bio: member.bio,
      avatar: member.avatar || "",
      linkedinUrl: member.linkedinUrl || "",
      twitterUrl: member.twitterUrl || "",
      isActive: member.isActive,
    })
    setAvatarFile(null)
    setAvatarPreview(member.avatar || "")
    setUploadProgress(0)
    setShowDialog(true)
  }

  function openDeleteDialog(member: TeamMember) {
    setDeletingMember(member)
    setShowDeleteDialog(true)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file")
      return
    }

    setAvatarFile(file)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }

  function removeAvatar() {
    setAvatarFile(null)
    setAvatarPreview("")
    setFormData({ ...formData, avatar: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleSubmit() {
    if (!formData.name.trim() || !formData.role.trim()) {
      toast.error(dict.admin?.team?.toasts?.nameRoleRequired || "Name and role are required")
      return
    }

    setSaving(true)

    // Upload avatar if a new file is selected
    let avatarUrl = formData.avatar
    if (avatarFile) {
      setUploadingAvatar(true)
      try {
        const result = await uploadToCloudinary(avatarFile, "team_avatars", {
          onProgress: (progress) => setUploadProgress(progress),
        })
        if (result.url) {
          avatarUrl = result.url
          toast.success(dict.admin?.team?.toasts?.photoUploaded || "Photo uploaded successfully")
        }
      } catch (error) {
        toast.error(dict.admin?.team?.toasts?.photoUploadFailed || "Failed to upload photo")
        setSaving(false)
        setUploadingAvatar(false)
        return
      }
      setUploadingAvatar(false)
    }

    if (editingMember && editingMember._id) {
      const result = await updateTeamMember(editingMember._id.toString(), {
        name: formData.name,
        email: formData.email.trim() || undefined,
        role: formData.role,
        bio: formData.bio,
        avatar: avatarUrl || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        twitterUrl: formData.twitterUrl || undefined,
        isActive: formData.isActive,
      })

      if (result.success) {
        toast.success(dict.admin?.team?.toasts?.memberUpdated || "Team member updated successfully")
        setShowDialog(false)
        loadMembers()
      } else {
        toast.error(result.error || (dict.admin?.team?.toasts?.failedToUpdate || "Failed to update team member"))
      }
    } else {
      const result = await createTeamMember({
        name: formData.name,
        email: formData.email.trim() || undefined,
        role: formData.role,
        bio: formData.bio,
        avatar: avatarUrl || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        twitterUrl: formData.twitterUrl || undefined,
        order: members.length,
        isActive: formData.isActive,
      })

      if (result.success) {
        toast.success(dict.admin?.team?.toasts?.memberAdded || "Team member added successfully")
        setShowDialog(false)
        loadMembers()
      } else {
        toast.error(result.error || (dict.admin?.team?.toasts?.failedToAdd || "Failed to add team member"))
      }
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!deletingMember || !deletingMember._id) return

    setSaving(true)
    const result = await deleteTeamMember(deletingMember._id.toString())

    if (result.success) {
      toast.success(dict.admin?.team?.toasts?.memberDeleted || "Team member deleted successfully")
      setShowDeleteDialog(false)
      setDeletingMember(null)
      loadMembers()
    } else {
      toast.error(result.error || (dict.admin?.team?.toasts?.failedToDelete || "Failed to delete team member"))
    }

    setSaving(false)
  }

  async function toggleActive(member: TeamMember) {
    if (!member._id) return

    const result = await updateTeamMember(member._id.toString(), {
      isActive: !member.isActive,
    })

    if (result.success) {
      toast.success(
        member.isActive
          ? (dict.admin?.team?.toasts?.memberHidden || "Team member hidden from about page")
          : (dict.admin?.team?.toasts?.memberVisible || "Team member visible on about page")
      )
      loadMembers()
    } else {
      toast.error(dict.admin?.team?.toasts?.failedToUpdate || "Failed to update team member")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{dict.admin?.team?.title || "Team Members"}</h1>
          <p className="text-muted-foreground">
            {dict.admin?.team?.subtitle || "Manage team members displayed on the About page"}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {dict.admin?.team?.addMember || "Add Member"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{members.length}</p>
              <p className="text-sm text-muted-foreground">{dict.admin?.team?.totalMembers || "Total Members"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {members.filter((m) => m.isActive).length}
              </p>
              <p className="text-sm text-muted-foreground">{dict.admin?.common?.active || "Active"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {members.filter((m) => !m.isActive).length}
              </p>
              <p className="text-sm text-muted-foreground">{dict.admin?.team?.hidden || "Hidden"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{dict.admin?.team?.allTeamMembers || "All Team Members"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AdminTableSkeleton rows={5} />
          ) : members.length > 0 ? (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member._id?.toString()}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {member.name}
                      </p>
                      <Badge
                        variant={member.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {member.isActive ? (dict.admin?.common?.active || "Active") : (dict.admin?.team?.hidden || "Hidden")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.role}
                    </p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" /> {member.email}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {member.linkedinUrl && (
                        <a
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {member.twitterUrl && (
                        <a
                          href={member.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Twitter className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(member)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {dict.admin?.common?.edit || "Edit"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(member)}>
                        <User className="h-4 w-4 mr-2" />
                        {member.isActive ? (dict.admin?.team?.hide || "Hide") : (dict.admin?.team?.show || "Show")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(member)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {dict.admin?.common?.delete || "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{dict.admin?.team?.noTeamMembersYet || "No team members yet"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {dict.admin?.team?.noTeamMembersDescription || "Add team members to display on the About page"}
              </p>
              <Button onClick={openCreateDialog} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {dict.admin?.team?.addFirstMember || "Add First Member"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? (dict.admin?.team?.editTeamMember || "Edit Team Member") : (dict.admin?.team?.addTeamMember || "Add Team Member")}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? (dict.admin?.team?.updateTeamMemberDetails || "Update team member details")
                : (dict.admin?.team?.addTeamMemberDescription || "Add a new team member to display on the About page")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{dict.admin?.team?.nameLabel || "Name *"}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{dict.admin?.team?.emailLabel || "Email"}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
              <p className="text-xs text-muted-foreground">
                {dict.admin?.team?.emailHint || "Used for contact inquiry notifications"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{dict.admin?.team?.roleLabel || "Role / Designation *"}</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="Co-Founder & CEO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">{dict.admin?.team?.bioLabel || "Bio"}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder={dict.admin?.team?.bioPlaceholder || "Brief description about the team member..."}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{dict.admin?.team?.photoLabel || "Photo"}</Label>
              <div className="flex items-start gap-4">
                {/* Photo Preview */}
                <div className="relative">
                  {avatarPreview ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                      <Image
                        src={avatarPreview}
                        alt="Avatar preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-lg hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                {/* Upload Button */}
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {avatarPreview ? (dict.admin?.team?.changePhoto || "Change Photo") : (dict.admin?.team?.uploadPhoto || "Upload Photo")}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {dict.admin?.team?.photoHint || "JPG, PNG or WebP. Max 5MB."}
                  </p>
                  {uploadingAvatar && (
                    <div className="space-y-1">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        {(dict.admin?.team?.uploadingProgress || "Uploading... {progress}%").replace("{progress}", String(uploadProgress))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin">{dict.admin?.team?.linkedinUrl || "LinkedIn URL"}</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedinUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedinUrl: e.target.value })
                  }
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">{dict.admin?.team?.twitterUrl || "Twitter URL"}</Label>
                <Input
                  id="twitter"
                  value={formData.twitterUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, twitterUrl: e.target.value })
                  }
                  placeholder="https://twitter.com/..."
                />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="active">{dict.admin?.team?.showOnAboutPage || "Show on About Page"}</Label>
                <p className="text-sm text-muted-foreground">
                  {dict.admin?.team?.showOnAboutPageHint || "When enabled, this member will be visible on the About page"}
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={saving || uploadingAvatar}
            >
              {dict.admin?.common?.cancel || "Cancel"}
            </Button>
            <Button onClick={handleSubmit} disabled={saving || uploadingAvatar}>
              {(saving || uploadingAvatar) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {uploadingAvatar ? (dict.admin?.team?.uploading || "Uploading...") : (editingMember ? (dict.admin?.common?.update || "Update") : (dict.admin?.common?.add || "Add"))} {dict.admin?.team?.member || "Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.admin?.team?.deleteTeamMember || "Delete Team Member"}</DialogTitle>
            <DialogDescription>
              {(dict.admin?.team?.deleteConfirmation || "Are you sure you want to delete \"{name}\"? This action cannot be undone.").replace("{name}", deletingMember?.name || "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={saving}
            >
              {dict.admin?.common?.cancel || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {dict.admin?.common?.delete || "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
