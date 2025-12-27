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
} from "lucide-react"
import type { TeamMember } from "@/lib/types"

export default function AdminTeamPage() {
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
      toast.error("Failed to load team members")
    }
    setLoading(false)
  }

  function openCreateDialog() {
    setEditingMember(null)
    setFormData({
      name: "",
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
      toast.error("Name and role are required")
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
        avatarUrl = result.url
        toast.success("Photo uploaded successfully")
      } catch (error) {
        toast.error("Failed to upload photo")
        setSaving(false)
        setUploadingAvatar(false)
        return
      }
      setUploadingAvatar(false)
    }

    if (editingMember && editingMember._id) {
      const result = await updateTeamMember(editingMember._id.toString(), {
        name: formData.name,
        role: formData.role,
        bio: formData.bio,
        avatar: avatarUrl || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        twitterUrl: formData.twitterUrl || undefined,
        isActive: formData.isActive,
      })

      if (result.success) {
        toast.success("Team member updated successfully")
        setShowDialog(false)
        loadMembers()
      } else {
        toast.error(result.error || "Failed to update team member")
      }
    } else {
      const result = await createTeamMember({
        name: formData.name,
        role: formData.role,
        bio: formData.bio,
        avatar: avatarUrl || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        twitterUrl: formData.twitterUrl || undefined,
        order: members.length,
        isActive: formData.isActive,
      })

      if (result.success) {
        toast.success("Team member added successfully")
        setShowDialog(false)
        loadMembers()
      } else {
        toast.error(result.error || "Failed to add team member")
      }
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!deletingMember || !deletingMember._id) return

    setSaving(true)
    const result = await deleteTeamMember(deletingMember._id.toString())

    if (result.success) {
      toast.success("Team member deleted successfully")
      setShowDeleteDialog(false)
      setDeletingMember(null)
      loadMembers()
    } else {
      toast.error(result.error || "Failed to delete team member")
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
          ? "Team member hidden from about page"
          : "Team member visible on about page"
      )
      loadMembers()
    } else {
      toast.error("Failed to update team member")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Team Members</h1>
          <p className="text-muted-foreground">
            Manage team members displayed on the About page
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
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
              <p className="text-sm text-muted-foreground">Total Members</p>
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
              <p className="text-sm text-muted-foreground">Active</p>
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
              <p className="text-sm text-muted-foreground">Hidden</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">All Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
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
                        {member.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.role}
                    </p>
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
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(member)}>
                        <User className="h-4 w-4 mr-2" />
                        {member.isActive ? "Hide" : "Show"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(member)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add team members to display on the About page
              </p>
              <Button onClick={openCreateDialog} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Member
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
              {editingMember ? "Edit Team Member" : "Add Team Member"}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? "Update team member details"
                : "Add a new team member to display on the About page"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
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
              <Label htmlFor="role">Role / Designation *</Label>
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
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Brief description about the team member..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Photo</Label>
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
                    {avatarPreview ? "Change Photo" : "Upload Photo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP. Max 5MB.
                  </p>
                  {uploadingAvatar && (
                    <div className="space-y-1">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
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
                <Label htmlFor="twitter">Twitter URL</Label>
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
                <Label htmlFor="active">Show on About Page</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, this member will be visible on the About page
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
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || uploadingAvatar}>
              {(saving || uploadingAvatar) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {uploadingAvatar ? "Uploading..." : (editingMember ? "Update" : "Add")} Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingMember?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
