"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { 
  suspendUser, 
  reactivateUser, 
  adminDeleteUser, 
  verifyUser,
  adminChangeUserRole,
  banUser,
  unbanUser,
} from "@/lib/actions"
import { 
  MoreHorizontal, 
  User, 
  Ban, 
  Trash2, 
  CheckCircle, 
  RefreshCw,
  Loader2,
  ExternalLink,
  Shield,
  Building2,
  Heart,
  ShieldOff,
} from "lucide-react"
import Link from "next/link"

interface UserActionsProps {
  userId: string
  userName: string
  userType: "volunteer" | "ngo"
  isVerified: boolean
  isActive?: boolean
  isBanned?: boolean
  currentRole?: string
}

export function UserActions({ 
  userId, 
  userName, 
  userType, 
  isVerified,
  isActive = true,
  isBanned = false,
  currentRole,
}: UserActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBanDialog, setShowBanDialog] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  const handleVerify = async () => {
    setLoading(true)
    try {
      const result = await verifyUser(userId, userType, !isVerified)
      if (result.success) {
        toast.success(isVerified ? "User unverified" : "User verified successfully")
      } else {
        toast.error(result.error || "Failed to update verification")
      }
      router.refresh()
    } catch (error) {
      toast.error("An error occurred")
      console.error("Failed to verify:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async () => {
    setLoading(true)
    try {
      const result = await suspendUser(userId, userType)
      if (result.success) {
        toast.success("User suspended")
      } else {
        toast.error(result.error || "Failed to suspend user")
      }
      router.refresh()
    } catch (error) {
      toast.error("An error occurred")
      console.error("Failed to suspend:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async () => {
    setLoading(true)
    try {
      const result = await reactivateUser(userId, userType)
      if (result.success) {
        toast.success("User reactivated")
      } else {
        toast.error(result.error || "Failed to reactivate user")
      }
      router.refresh()
    } catch (error) {
      toast.error("An error occurred")
      console.error("Failed to reactivate:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async () => {
    if (!banReason.trim()) {
      toast.error("Please provide a reason for the ban")
      return
    }
    setLoading(true)
    try {
      const result = await banUser(userId, userType, banReason)
      if (result.success) {
        toast.success("User banned successfully")
        setShowBanDialog(false)
        setBanReason("")
      } else {
        toast.error(result.error || "Failed to ban user")
      }
      router.refresh()
    } catch (error) {
      toast.error("An error occurred")
      console.error("Failed to ban:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnban = async () => {
    setLoading(true)
    try {
      const result = await unbanUser(userId, userType)
      if (result.success) {
        toast.success("User unbanned")
      } else {
        toast.error(result.error || "Failed to unban user")
      }
      router.refresh()
    } catch (error) {
      toast.error("An error occurred")
      console.error("Failed to unban:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeRole = async (newRole: "volunteer" | "ngo" | "admin") => {
    setLoading(true)
    try {
      const result = await adminChangeUserRole(userId, newRole)
      if (result.success) {
        toast.success(`Role changed to ${newRole}`)
      } else {
        toast.error(result.error || "Failed to change role")
      }
      router.refresh()
    } catch (error) {
      toast.error("An error occurred")
      console.error("Failed to change role:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== "DELETE") return
    
    setLoading(true)
    try {
      const result = await adminDeleteUser(userId, userType)
      if (result.success) {
        toast.success("User deleted permanently")
        setShowDeleteDialog(false)
      } else {
        toast.error(result.error || "Failed to delete user")
      }
      router.refresh()
    } catch (error) {
      toast.error("An error occurred")
      console.error("Failed to delete:", error)
    } finally {
      setLoading(false)
    }
  }

  const profileUrl = userType === "volunteer" 
    ? `/volunteers/${userId}` 
    : `/ngos/${userId}`

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={profileUrl} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View Profile
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleVerify} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {isVerified ? "Unverify User" : "Verify User"}
          </DropdownMenuItem>
          
          {/* Role Change Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Change Role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem 
                onClick={() => handleChangeRole("volunteer")}
                className="flex items-center gap-2"
                disabled={currentRole === "volunteer"}
              >
                <Heart className="h-4 w-4" />
                Volunteer
                {currentRole === "volunteer" && <CheckCircle className="h-3 w-3 ml-auto text-green-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleChangeRole("ngo")}
                className="flex items-center gap-2"
                disabled={currentRole === "ngo"}
              >
                <Building2 className="h-4 w-4" />
                NGO
                {currentRole === "ngo" && <CheckCircle className="h-3 w-3 ml-auto text-green-600" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleChangeRole("admin")}
                className="flex items-center gap-2 text-red-600"
                disabled={currentRole === "admin"}
              >
                <Shield className="h-4 w-4" />
                Admin
                {currentRole === "admin" && <CheckCircle className="h-3 w-3 ml-auto text-green-600" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          
          {isActive ? (
            <DropdownMenuItem 
              onClick={handleSuspend}
              className="flex items-center gap-2 text-orange-600"
            >
              <Ban className="h-4 w-4" />
              Suspend User
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={handleReactivate}
              className="flex items-center gap-2 text-green-600"
            >
              <RefreshCw className="h-4 w-4" />
              Reactivate User
            </DropdownMenuItem>
          )}

          {/* Ban/Unban */}
          {isBanned ? (
            <DropdownMenuItem 
              onClick={handleUnban}
              className="flex items-center gap-2 text-green-600"
            >
              <ShieldOff className="h-4 w-4" />
              Unban User
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={() => setShowBanDialog(true)}
              className="flex items-center gap-2 text-red-600"
            >
              <Ban className="h-4 w-4" />
              Ban User
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Ban User</DialogTitle>
            <DialogDescription>
              You are about to ban <strong>{userName}</strong>. They will not be able to access the platform.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for ban</label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g., Violation of terms of service"
                className="mt-1.5"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBanDialog(false)
                setBanReason("")
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBan}
              disabled={!banReason.trim() || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete User</DialogTitle>
            <DialogDescription>
              You are about to permanently delete <strong>{userName}</strong> and all their data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmText("")
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmText !== "DELETE" || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
