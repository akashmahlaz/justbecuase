"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Unlock, CreditCard, Zap } from "lucide-react"
import { toast } from "sonner"

interface UnlockProfileButtonProps {
  volunteerId: string
  volunteerName?: string
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
  subscriptionPlan?: "free" | "pro" // NGO's current plan
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export function UnlockProfileButton({
  volunteerId,
  volunteerName,
  onSuccess,
  onError,
  className,
  subscriptionPlan = "free",
}: UnlockProfileButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }

      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  // Handle unlock for Pro users (free unlock via subscription)
  const handleProUnlock = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/payments/unlock-with-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to unlock profile")
      }

      toast.success("Profile unlocked!", {
        description: `You can now view ${volunteerName || "the volunteer"}'s full profile.`,
      })
      
      onSuccess?.()
      // Reload the page to show unlocked profile
      window.location.reload()
    } catch (error: any) {
      console.error("Unlock error:", error)
      toast.error("Failed to unlock", {
        description: error.message || "Something went wrong",
      })
      onError?.(error.message || "Failed to unlock profile")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle unlock for Free users (pay ₹499)
  const handlePaidUnlock = async () => {
    setIsLoading(true)

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error("Failed to load payment gateway")
      }

      // Create order
      const orderResponse = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId }),
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create payment order")
      }

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: "JustBecause.asia",
        description: `Unlock ${volunteerName || "volunteer"}'s profile`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                volunteerId,
              }),
            })

            const verifyData = await verifyResponse.json()

            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || "Payment verification failed")
            }

            toast.success("Profile unlocked!", {
              description: `You can now view ${volunteerName || "the volunteer"}'s full profile.`,
            })
            
            onSuccess?.()
            // Reload the page to show unlocked profile
            window.location.reload()
          } catch (error: any) {
            console.error("Payment verification error:", error)
            toast.error("Payment verification failed", {
              description: error.message,
            })
            onError?.(error.message || "Payment verification failed")
          }
        },
        prefill: {},
        theme: {
          color: "#0ea5e9",
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false)
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error: any) {
      console.error("Payment error:", error)
      toast.error("Payment error", {
        description: error.message || "Failed to initiate payment",
      })
      onError?.(error.message || "Failed to initiate payment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlock = () => {
    if (subscriptionPlan === "pro") {
      handleProUnlock()
    } else {
      handlePaidUnlock()
    }
  }

  return (
    <Button
      onClick={handleUnlock}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : subscriptionPlan === "pro" ? (
        <>
          <Zap className="h-4 w-4 mr-2" />
          Unlock Profile (Pro)
        </>
      ) : (
        <>
          <Unlock className="h-4 w-4 mr-2" />
          Unlock Profile (₹499)
        </>
      )}
    </Button>
  )
}
