// ============================================
// Input Validation Utilities
// ============================================

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate phone number (basic international format)
 */
export function isValidPhone(phone: string): boolean {
  // Allows +, digits, spaces, dashes, parentheses
  return /^[\d\s\-+()]{7,20}$/.test(phone)
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize string - remove potential XSS vectors
 */
export function sanitizeString(str: string, maxLength: number = 10000): string {
  if (!str) return ""
  // Remove control characters but keep newlines and tabs for text areas
  return str
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
}

/**
 * Validate and sanitize project data
 */
export function validateProjectData(data: {
  title: string
  description: string
  timeCommitment?: string
  duration?: string
  startDate?: Date
  deadline?: Date
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.title || data.title.length < 5) {
    errors.push("Title must be at least 5 characters")
  }
  if (data.title && data.title.length > 200) {
    errors.push("Title must be less than 200 characters")
  }

  if (!data.description || data.description.length < 20) {
    errors.push("Description must be at least 20 characters")
  }
  if (data.description && data.description.length > 10000) {
    errors.push("Description must be less than 10000 characters")
  }

  // Validate dates if both provided
  if (data.startDate && data.deadline) {
    if (new Date(data.deadline) < new Date(data.startDate)) {
      errors.push("Deadline cannot be before start date")
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate volunteer profile data
 */
export function validateVolunteerProfileData(data: {
  phone?: string
  bio?: string
  linkedinUrl?: string
  portfolioUrl?: string
  location?: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push("Invalid phone number format")
  }

  if (data.bio && data.bio.length > 2000) {
    errors.push("Bio must be less than 2000 characters")
  }

  if (data.linkedinUrl && !isValidUrl(data.linkedinUrl)) {
    errors.push("Invalid LinkedIn URL")
  }

  if (data.portfolioUrl && !isValidUrl(data.portfolioUrl)) {
    errors.push("Invalid portfolio URL")
  }

  if (data.location && data.location.length > 200) {
    errors.push("Location must be less than 200 characters")
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate NGO profile data
 */
export function validateNGOProfileData(data: {
  orgName?: string
  phone?: string
  website?: string
  description?: string
  mission?: string
  registrationNumber?: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (data.orgName && (data.orgName.length < 2 || data.orgName.length > 200)) {
    errors.push("Organization name must be between 2 and 200 characters")
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push("Invalid phone number format")
  }

  if (data.website && !isValidUrl(data.website)) {
    errors.push("Invalid website URL")
  }

  if (data.description && data.description.length > 5000) {
    errors.push("Description must be less than 5000 characters")
  }

  if (data.mission && data.mission.length > 2000) {
    errors.push("Mission must be less than 2000 characters")
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate volunteer pricing data
 * IA-013: hourlyRate must be > 0 for paid/both
 * IA-014: freeHoursPerMonth must be >= 0 for both
 */
export function validatePricingData(data: {
  volunteerType?: string
  hourlyRate?: number
  discountedRate?: number
  freeHoursPerMonth?: number
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const isPaid = data.volunteerType === "paid" || data.volunteerType === "both"
  const isBoth = data.volunteerType === "both"

  if (isPaid) {
    if (data.hourlyRate !== undefined && data.hourlyRate !== null) {
      if (typeof data.hourlyRate !== "number" || !isFinite(data.hourlyRate)) {
        errors.push("Hourly rate must be a valid number")
      } else if (data.hourlyRate <= 0) {
        errors.push("Hourly rate must be greater than zero")
      } else if (data.hourlyRate > 10000) {
        errors.push("Hourly rate cannot exceed 10,000")
      }
    }

    if (data.discountedRate !== undefined && data.discountedRate !== null) {
      if (typeof data.discountedRate !== "number" || !isFinite(data.discountedRate)) {
        errors.push("Discounted rate must be a valid number")
      } else if (data.discountedRate < 0) {
        errors.push("Discounted rate cannot be negative")
      } else if (data.discountedRate > 10000) {
        errors.push("Discounted rate cannot exceed 10,000")
      }
    }

    if (
      typeof data.hourlyRate === "number" && data.hourlyRate > 0 &&
      typeof data.discountedRate === "number" && data.discountedRate > 0 &&
      data.discountedRate >= data.hourlyRate
    ) {
      errors.push("Discounted rate must be less than the hourly rate")
    }
  }

  if (isBoth) {
    if (data.freeHoursPerMonth !== undefined && data.freeHoursPerMonth !== null) {
      if (typeof data.freeHoursPerMonth !== "number" || !isFinite(data.freeHoursPerMonth)) {
        errors.push("Free hours must be a valid number")
      } else if (data.freeHoursPerMonth < 0) {
        errors.push("Free hours per month cannot be negative")
      } else if (data.freeHoursPerMonth > 744) {
        errors.push("Free hours per month cannot exceed 744")
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate skills array
 */
export function validateSkills(skills: Array<{ categoryId: string; subskillId: string }>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!skills || !Array.isArray(skills)) {
    errors.push("Skills must be an array")
    return { valid: false, errors }
  }

  if (skills.length > 50) {
    errors.push("Maximum 50 skills allowed")
  }

  for (const skill of skills) {
    if (!skill.categoryId || !skill.subskillId) {
      errors.push("Each skill must have categoryId and subskillId")
      break
    }
  }

  return { valid: errors.length === 0, errors }
}
