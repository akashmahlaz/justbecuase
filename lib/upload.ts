// Signed Cloudinary Upload Utility
// Enterprise-grade secure image uploads

interface SignedUploadParams {
  signature: string
  timestamp: number
  cloudName: string
  apiKey: string
  folder: string
  publicId?: string
}

interface UploadResult {
  success: boolean
  url?: string
  publicId?: string
  error?: string
}

/**
 * Get signed upload parameters from the server
 */
export async function getSignedUploadParams(
  folder: string = "uploads",
  publicId?: string
): Promise<SignedUploadParams | null> {
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folder, publicId }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Failed to get upload signature:", error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Upload signature error:", error)
    return null
  }
}

/**
 * Upload a file to Cloudinary with signed upload
 */
export async function uploadToCloudinary(
  file: File,
  folder: string = "uploads",
  options?: {
    publicId?: string
    onProgress?: (percent: number) => void
  }
): Promise<UploadResult> {
  // Validate file
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Please upload an image file (JPG, PNG, etc.)" }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File size must be less than 5MB" }
  }

  try {
    // Get signed params from server
    const params = await getSignedUploadParams(folder, options?.publicId)
    
    if (!params) {
      return { success: false, error: "Failed to authorize upload" }
    }

    // Build form data
    const formData = new FormData()
    formData.append("file", file)
    formData.append("signature", params.signature)
    formData.append("timestamp", params.timestamp.toString())
    formData.append("api_key", params.apiKey)
    formData.append("folder", params.folder)
    
    if (params.publicId) {
      formData.append("public_id", params.publicId)
    }

    // Upload with progress tracking
    const uploadUrl = `https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && options?.onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100)
          options.onProgress(percent)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText)
          resolve({
            success: true,
            url: data.secure_url,
            publicId: data.public_id,
          })
        } else {
          let errorMessage = "Upload failed"
          try {
            const error = JSON.parse(xhr.responseText)
            errorMessage = error.error?.message || errorMessage
          } catch {}
          resolve({ success: false, error: errorMessage })
        }
      })

      xhr.addEventListener("error", () => {
        resolve({ success: false, error: "Network error during upload" })
      })

      xhr.addEventListener("abort", () => {
        resolve({ success: false, error: "Upload cancelled" })
      })

      xhr.open("POST", uploadUrl)
      xhr.send(formData)
    })
  } catch (error) {
    console.error("Upload error:", error)
    return { success: false, error: "Upload failed. Please try again." }
  }
}

/**
 * Helper to validate image files before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: "Please upload a valid image (JPEG, PNG, GIF, or WebP)" }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: "File size must be less than 5MB" }
  }

  return { valid: true }
}
