// Email sending utility for JustBecause.asia
// Configure RESEND_API_KEY in your environment variables

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@justbecause.asia"

interface EmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  // If no API key, log and return (for development)
  if (!RESEND_API_KEY) {
    console.log("📧 Email would be sent (RESEND_API_KEY not configured):")
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Content: ${text || html}`)
    return true
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Failed to send email:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Email send error:", error)
    return false
  }
}

// Email templates
export function getVerificationEmailHtml(url: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBecause.asia</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Volunteering Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">Verify Your Email</h2>
        <p>Hi${userName ? ` ${userName}` : ''},</p>
        <p>Thank you for signing up for JustBecause.asia! Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} JustBecause.asia. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

export function getPasswordResetEmailHtml(url: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBecause.asia</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Volunteering Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">Reset Your Password</h2>
        <p>Hi${userName ? ` ${userName}` : ''},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} JustBecause.asia. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

export function getWelcomeEmailHtml(userName: string, userRole: string): string {
  const dashboardUrl = userRole === 'ngo' ? '/ngo/dashboard' : '/volunteer/dashboard'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBecause.asia</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Volunteering Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">Welcome to JustBecause.asia! 🎉</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for joining our community of ${userRole === 'ngo' ? 'organizations making a difference' : 'skilled volunteers'}!</p>
        
        ${userRole === 'ngo' ? `
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your organization profile</li>
          <li>Post your first project</li>
          <li>Browse talented volunteers</li>
        </ul>
        ` : `
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your profile with your skills</li>
          <li>Browse available opportunities</li>
          <li>Apply to projects that match your expertise</li>
        </ul>
        `}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://justbecause.asia${dashboardUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} JustBecause.asia. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}
