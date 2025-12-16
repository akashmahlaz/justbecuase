"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Mail, 
  Link2, 
  Check,
  MessageCircle,
} from "lucide-react"
import { toast } from "sonner"

interface ShareButtonProps {
  url?: string
  title: string
  description?: string
  variant?: "default" | "outline" | "ghost"
  className?: string
}

export function ShareButton({ 
  url, 
  title, 
  description = "",
  variant = "outline",
  className = "",
}: ShareButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Use current URL if not provided
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "")
  
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(title)
  const encodedDescription = encodeURIComponent(description)

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy link")
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        })
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== "AbortError") {
          setShowDialog(true)
        }
      }
    } else {
      setShowDialog(true)
    }
  }

  return (
    <>
      <Button 
        variant={variant} 
        className={className}
        onClick={handleNativeShare}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this content</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-5 gap-4 py-4">
            <a
              href={shareLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center">
                <Twitter className="h-5 w-5 text-[#1DA1F2]" />
              </div>
              <span className="text-xs text-muted-foreground">Twitter</span>
            </a>
            
            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                <Facebook className="h-5 w-5 text-[#1877F2]" />
              </div>
              <span className="text-xs text-muted-foreground">Facebook</span>
            </a>
            
            <a
              href={shareLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#0A66C2]/10 flex items-center justify-center">
                <Linkedin className="h-5 w-5 text-[#0A66C2]" />
              </div>
              <span className="text-xs text-muted-foreground">LinkedIn</span>
            </a>
            
            <a
              href={shareLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
              </div>
              <span className="text-xs text-muted-foreground">WhatsApp</span>
            </a>
            
            <a
              href={shareLinks.email}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <span className="text-xs text-muted-foreground">Email</span>
            </a>
          </div>
          
          <div className="flex items-center gap-2">
            <Input 
              value={shareUrl} 
              readOnly 
              className="flex-1 text-sm"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
