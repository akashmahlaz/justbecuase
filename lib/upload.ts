// Signed Cloudinary Upload Utility
// NGO-grade secure file uploads (images & documents)

interface SignedUploadParams {
  signature: string
  timestamp: number
  cloudName: string
  apiKey: string
  folder: string
  publicId?: string
  resourceType?: "image" | "raw" | "auto"
}

interface UploadResult {
  success: boolean
  url?: string
  publicId?: string
  error?: string
  fileName?: string
  fileType?: string
}

// Supported file types for different upload contexts
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
export const SUPPORTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]
export const SUPPORTED_ALL_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_TYPES]

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

/**
 * Helper to validate document files before upload
 */
export function validateDocumentFile(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
  if (!SUPPORTED_ALL_TYPES.includes(file.type)) {
    return { valid: false, error: "Please upload a valid file (PDF, DOC, DOCX, JPG, PNG, or GIF)" }
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
  }

  return { valid: true }
}

/**
 * Upload a document or any file to Cloudinary (supports PDFs, DOCs, images)
 */
export async function uploadDocumentToCloudinary(
  file: File,
  folder: string = "documents",
  options?: {
    publicId?: string
    onProgress?: (percent: number) => void
    maxSizeMB?: number
  }
): Promise<UploadResult> {
  const maxSize = options?.maxSizeMB || 10
  
  // Validate file type
  if (!SUPPORTED_ALL_TYPES.includes(file.type)) {
    return { success: false, error: "Unsupported file type. Please upload PDF, DOC, DOCX, or images." }
  }

  // Validate file size
  if (file.size > maxSize * 1024 * 1024) {
    return { success: false, error: `File size must be less than ${maxSize}MB` }
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

    // Determine resource type: images use image, others use auto (for raw files)
    const isImage = file.type.startsWith("image/")
    const resourceType = isImage ? "image" : "auto"
    const uploadUrl = `https://api.cloudinary.com/v1_1/${params.cloudName}/${resourceType}/upload`

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
            fileName: file.name,
            fileType: file.type,
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
    console.error("Document upload error:", error)
    return { success: false, error: "Upload failed. Please try again." }
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase()
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): "image" | "pdf" | "doc" | "file" {
  if (fileType.startsWith("image/")) return "image"
  if (fileType === "application/pdf") return "pdf"
  if (fileType.includes("word") || fileType.includes("document")) return "doc"
  return "file"
}
