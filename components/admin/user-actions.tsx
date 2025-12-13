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
import { 
  suspendUser, 
  reactivateUser, 
  adminDeleteUser, 
  verifyUser 
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
} from "lucide-react"
import Link from "next/link"

interface UserActionsProps {
  userId: string
  userName: string
  userType: "volunteer" | "ngo"
  isVerified: boolean
  isActive?: boolean
}

export function UserActions({ 
  userId, 
  userName, 
  userType, 
  isVerified,
  isActive = true
}: UserActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  const handleVerify = async () => {
    setLoading(true)
    try {
      await verifyUser(userId, userType, !isVerified)
      router.refresh()
    } catch (error) {
      console.error("Failed to verify:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async () => {
    setLoading(true)
    try {
      await suspendUser(userId, userType)
      router.refresh()
    } catch (error) {
      console.error("Failed to suspend:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async () => {
    setLoading(true)
    try {
      await reactivateUser(userId, userType)
      router.refresh()
    } catch (error) {
      console.error("Failed to reactivate:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== "DELETE") return
    
    setLoading(true)
    try {
      await adminDeleteUser(userId, userType)
      setShowDeleteDialog(false)
      router.refresh()
    } catch (error) {
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
