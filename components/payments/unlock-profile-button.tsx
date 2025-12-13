"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Unlock, CreditCard } from "lucide-react"

interface UnlockProfileButtonProps {
  volunteerId: string
  volunteerName?: string
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
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

  const handleUnlock = async () => {
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

            onSuccess?.()
            // Reload the page to show unlocked profile
            window.location.reload()
          } catch (error: any) {
            console.error("Payment verification error:", error)
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
      onError?.(error.message || "Failed to initiate payment")
    } finally {
      setIsLoading(false)
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
      ) : (
        <>
          <Unlock className="h-4 w-4 mr-2" />
          Unlock Profile (₹499)
        </>
      )}
    </Button>
  )
}
