// Email sending utility for JustBecause Network
// Configure RESEND_API_KEY in your environment variables

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_AKASH
const FROM_EMAIL = process.env.FROM_EMAIL || "JustBeCause <onboarding@resend.dev>"

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
    console.log(`[Email] Sending to ${to} with subject: "${subject}"`)
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
      console.error(`[Email] Failed (${response.status}):`, error)
      return false
    }

    const result = await response.json()
    console.log(`[Email] Sent successfully to ${to}:`, result)
    return true
  } catch (error) {
    console.error("[Email] Error:", error)
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
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">Verify Your Email</h2>
        <p>Hi${userName ? ` ${userName}` : ''},</p>
        <p>Thank you for signing up for JustBeCause Network! Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
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
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
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
        <p>© ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

export function getPasswordResetCodeEmailHtml(code: string, url?: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">Reset Your Password</h2>
        <p>Hi${userName ? ` ${userName}` : ''},</p>
        <p>Use the verification code below to reset your password. This code will expire in 1 hour.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 28px; letter-spacing: 4px; background: #fff; display: inline-block; padding: 12px 20px; border-radius: 8px;">
            <strong>${code}</strong>
          </div>
        </div>

        ${url ? `<p style="text-align:center; margin-top: 10px;"><a href="${url}" style="color:#10b981;">Or click here to continue</a></p>` : ''}

        <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
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
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">Welcome to JustBeCause Network! 🎉</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for joining our community of ${userRole === 'ngo' ? 'organizations making a difference' : 'skilled impact agents'}!</p>
        
        ${userRole === 'ngo' ? `
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your organization profile</li>
          <li>Post your first project</li>
          <li>Browse talented impact agents</li>
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
          <a href="https://justbecausenetwork.com${dashboardUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} JustBecause Network. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

export function getNewOpportunityEmailHtml(
  volunteerName: string,
  opportunityTitle: string,
  ngoName: string,
  opportunityId: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">New Opportunity Matching Your Skills! 🎯</h2>
        <p>Hi ${volunteerName},</p>
        <p><strong>${ngoName}</strong> just posted a new opportunity that matches your skills:</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #10b981; margin-top: 0;">${opportunityTitle}</h3>
          <p style="color: #666; margin-bottom: 0;">Posted by ${ngoName}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://justbecausenetwork.com/projects/${opportunityId}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Opportunity
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">You received this email because your skills match this opportunity. You can manage your notification preferences in your dashboard settings.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

export function getNewFollowerEmailHtml(
  recipientName: string,
  followerName: string,
  followerRole: string,
  followerProfileUrl: string,
  recipientProfileUrl: string,
  followerCount: number
): string {
  const roleLabel = followerRole === "ngo" ? "NGO" : "Impact Agent"
  const followerCountText = followerCount === 1 ? "1 follower" : `${followerCount.toLocaleString()} followers`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
      <div style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">JustBeCause Network</h1>
          <p style="color: #d1fae5; margin: 6px 0 0; font-size: 14px;">Skills-Based Impact Platform</p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 30px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background: #ecfdf5; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 12px;">\uD83D\uDC65</div>
            <h2 style="margin: 0; color: #111827; font-size: 22px;">You Have a New Follower!</h2>
          </div>

          <p style="color: #374151; font-size: 16px;">Hi ${recipientName},</p>
          <p style="color: #374151; font-size: 16px;">Great news! <strong>${followerName}</strong> (${roleLabel}) just started following you on JustBeCause Network.</p>

          <!-- Follower Card -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
            <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px;">${followerName}</div>
            <div style="display: inline-block; background: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin-bottom: 12px;">${roleLabel}</div>
            <div style="margin-top: 8px;">
              <a href="https://justbecausenetwork.com${followerProfileUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Their Profile</a>
            </div>
          </div>

          <!-- Stats -->
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">You now have</p>
            <p style="margin: 4px 0; color: #047857; font-size: 28px; font-weight: 800;">${followerCountText}</p>
            <p style="margin: 0; color: #065f46; font-size: 14px;">Keep up the amazing work!</p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="https://justbecausenetwork.com${recipientProfileUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">View Your Profile</a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center;">You received this because someone followed you on JustBeCause Network. Manage your notification preferences in your dashboard settings.</p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Email template when someone sends a new message
 */
export function getNewMessageEmailHtml(
  recipientName: string,
  senderName: string,
  senderRole: string,
  messagePreview: string,
  messagesUrl: string
): string {
  const roleLabel = senderRole === "ngo" ? "NGO" : "Impact Agent"
  const truncated = messagePreview.length > 120 ? messagePreview.substring(0, 120) + "..." : messagePreview

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">New Message from ${senderName} &#x1F4AC;</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${senderName}</strong> (${roleLabel}) sent you a message on JustBeCause Network:</p>
        
        <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #666; font-style: italic; margin: 0;">&ldquo;${truncated}&rdquo;</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://justbecausenetwork.com${messagesUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Reply to Message
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Don't leave them waiting! Log in to reply and keep the conversation going.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Email template when a volunteer applies to a project
 */
export function getNewApplicationEmailHtml(
  ngoName: string,
  volunteerName: string,
  projectTitle: string,
  coverMessage?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">New Application Received! &#x1F4CB;</h2>
        <p>Hi ${ngoName},</p>
        <p><strong>${volunteerName}</strong> has applied to your project <strong>&ldquo;${projectTitle}&rdquo;</strong> on JustBeCause Network.</p>
        
        ${coverMessage ? `
        <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #888; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; font-weight: 600;">Cover Message</p>
          <p style="color: #666; font-style: italic; margin: 0;">&ldquo;${coverMessage}&rdquo;</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://justbecausenetwork.com/ngo/applications" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Review Applications
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Review and respond to this application quickly to find the best talent for your project.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Email template when application status is updated (accepted/rejected)
 */
export function getApplicationStatusEmailHtml(
  volunteerName: string,
  projectTitle: string,
  ngoName: string,
  status: "accepted" | "rejected" | "shortlisted",
  notes?: string
): string {
  const statusConfig = {
    accepted: { emoji: "&#x1F389;", color: "#10b981", title: "Application Accepted!", message: "Great news! Your application has been accepted." },
    shortlisted: { emoji: "&#x2B50;", color: "#f59e0b", title: "You've Been Shortlisted!", message: "Your application has been shortlisted for further review." },
    rejected: { emoji: "", color: "#6b7280", title: "Application Update", message: "Unfortunately, your application was not selected this time." },
  }
  const config = statusConfig[status] || statusConfig.rejected

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">${config.title} ${config.emoji}</h2>
        <p>Hi ${volunteerName},</p>
        <p>${config.message}</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: ${config.color}; margin-top: 0;">${projectTitle}</h3>
          <p style="color: #666; margin-bottom: 0;">by ${ngoName}</p>
        </div>
        
        ${notes ? `
        <div style="background: white; border-left: 4px solid ${config.color}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #888; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; font-weight: 600;">Note from ${ngoName}</p>
          <p style="color: #666; margin: 0;">${notes}</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://justbecausenetwork.com/volunteer/applications" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View My Applications
          </a>
        </div>
        
        ${status === "rejected" ? '<p style="color: #666; font-size: 14px;">Don\'t be discouraged! There are many more opportunities waiting for you on JustBeCause Network.</p>' : '<p style="color: #666; font-size: 14px;">Log in to your dashboard for more details.</p>'}
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Email template when any user contacts/connects with another user (generic)
 */
export function getContactEmailHtml(
  recipientName: string,
  senderName: string,
  senderRole: string,
  message?: string
): string {
  const roleLabel = senderRole === "ngo" ? "NGO" : "Impact Agent"

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">Someone wants to connect! &#x1F91D;</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${senderName}</strong> (${roleLabel}) has reached out to you on JustBeCause Network.</p>
        
        ${message ? `
        <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #666; font-style: italic; margin: 0;">&ldquo;${message}&rdquo;</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://justbecausenetwork.com/volunteer/messages" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Messages
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Don't miss this connection opportunity! Log in to reply and start collaborating.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Email template for subscription confirmation (Pro plan activation)
 */
export function getSubscriptionConfirmationEmailHtml(
  recipientName: string,
  planName: string,
  amount: number,
  currency: string,
  expiryDate: string,
  role: "ngo" | "volunteer"
): string {
  const dashboardUrl = role === "ngo" ? "/ngo/dashboard" : "/volunteer/dashboard"
  const features = role === "ngo" 
    ? [
        "Unlimited access to pro bono Impact Agents",
        "Unlimited profile unlocks",
        "Priority project visibility",
        "Advanced matching &amp; search",
      ]
    : [
        "Unlimited project applications",
        "Priority in search results",
        "Pro badge on your profile",
        "Advanced analytics",
      ]

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Pro! &#x1F389;</h1>
          <p style="color: #d1fae5; margin-top: 8px;">JustBeCause Network</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Hi ${recipientName},</p>
          <p>Your <strong>${planName}</strong> subscription is now active! Thank you for upgrading.</p>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #111827;">Payment Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="text-align: right; font-weight: 600;">${planName}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="text-align: right; font-weight: 600;">${currency} ${(amount / 100).toFixed(2)}</td></tr>
              <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 8px 0; color: #666;">Valid until</td><td style="text-align: right; font-weight: 600;">${expiryDate}</td></tr>
            </table>
          </div>

          <h3>What's included:</h3>
          <ul style="padding-left: 20px;">
            ${features.map(f => '<li style="margin-bottom: 8px; color: #374151;">' + f + '</li>').join("")}
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://justbecausenetwork.com${dashboardUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Dashboard</a>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Email template for subscription expiry reminder
 */
export function getSubscriptionExpiryReminderEmailHtml(
  recipientName: string,
  daysLeft: number,
  expiryDate: string,
  role: "ngo" | "volunteer"
): string {
  const pricingUrl = "/pricing"
  const isExpired = daysLeft <= 0
  const heading = isExpired ? "Your Pro Plan Has Expired" : `Your Pro Plan Expires in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}`
  const headerColor = isExpired ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
  const subColor = isExpired ? "#fecaca" : "#fef3c7"
  const ctaText = isExpired ? "Renew Now" : "Renew Early"
  const ctaColor = isExpired ? "#ef4444" : "#f59e0b"
  
  const lostFeatures = role === "ngo" 
    ? [
        "Unlimited access to pro bono Impact Agents",
        "Unlimited profile unlocks",
        "Priority project visibility",
        "Advanced matching &amp; search",
      ]
    : [
        "Unlimited project applications",
        "Priority in search results",
        "Pro badge on your profile",
        "Advanced analytics",
      ]

  const urgencyMessage = isExpired
    ? "Your Pro subscription has expired and you've been downgraded to the Free plan. Renew now to regain access to all Pro features."
    : `Your Pro subscription will expire on <strong>${expiryDate}</strong>. Renew now to avoid losing access to these features:`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: ${headerColor}; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${heading}</h1>
          <p style="color: ${subColor}; margin-top: 8px;">JustBeCause Network</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Hi ${recipientName},</p>
          <p>${urgencyMessage}</p>
          
          <ul style="padding-left: 20px; margin: 20px 0;">
            ${lostFeatures.map(f => '<li style="margin-bottom: 8px; color: #374151;">' + f + '</li>').join("")}
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://justbecausenetwork.com${pricingUrl}" style="display: inline-block; background: ${ctaColor}; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${ctaText}</a>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; text-align: center;">
            Questions? Reply to this email and we'll be happy to help.
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Email template for profile completeness nudge (sent to users who haven't completed onboarding)
 */
export function getProfileNudgeEmailHtml(
  recipientName: string,
  role: "ngo" | "volunteer",
  onboardingUrl: string
): string {
  const roleLabel = role === "ngo" ? "NGO" : "Impact Agent"
  const benefits = role === "ngo" 
    ? "post projects, find skilled Impact Agents, and start making an impact"
    : "discover projects, connect with NGOs, and start making a difference"

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Complete Your Profile</h1>
          <p style="color: #d1fae5; margin-top: 8px;">JustBeCause Network</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Hi ${recipientName},</p>
          <p>We noticed you signed up as a <strong>${roleLabel}</strong> but haven't completed your profile yet.</p>
          <p>Finishing your profile takes just a few minutes, and it will allow you to ${benefits}.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://justbecausenetwork.com${onboardingUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Complete Your Profile</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">The world needs your skills. Let's get started!</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ============================================
// WEEKLY DIGEST EMAIL
// ============================================
export function getWeeklyDigestEmailHtml(
  userName: string,
  data: {
    newProjects: number
    matchingProjects: { title: string; id: string }[]
    profileViews: number
    newBadges: string[]
  }
): string {
  const projectLinks = data.matchingProjects.slice(0, 5).map(
    (p) => `<li style="margin-bottom: 8px;"><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"}/projects/${p.id}" style="color: #6366f1; text-decoration: none; font-weight: 500;">${p.title}</a></li>`
  ).join("")

  const badgesList = data.newBadges.length > 0
    ? `<div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin: 16px 0;"><strong>🏆 New Badges Earned:</strong> ${data.newBadges.join(", ")}</div>`
    : ""

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">📊 Your Weekly Impact Digest</h1>
        </div>
        <div style="padding: 24px;">
          <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #6b7280;">Here's what happened on JustBeCause this week:</p>
          
          <div style="display: flex; gap: 12px; margin: 20px 0;">
            <div style="flex: 1; background: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${data.newProjects}</div>
              <div style="font-size: 12px; color: #6b7280;">New Opportunities</div>
            </div>
            <div style="flex: 1; background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${data.profileViews}</div>
              <div style="font-size: 12px; color: #6b7280;">Profile Views</div>
            </div>
          </div>

          ${badgesList}

          ${data.matchingProjects.length > 0 ? `
          <h3 style="color: #374151; margin-top: 24px;">🎯 Opportunities Matching Your Skills</h3>
          <ul style="padding-left: 20px; color: #4b5563;">${projectLinks}</ul>
          ` : ""}

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"}/projects" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Browse All Opportunities</a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} JustBeCause Network</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ============================================
// RE-ENGAGEMENT EMAIL
// ============================================
export function getReEngagementEmailHtml(
  userName: string,
  data: {
    daysSinceLastLogin: number
    newProjectsSince: number
    missedMatches: number
  }
): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">👋 We Miss You, ${userName}!</h1>
        </div>
        <div style="padding: 24px;">
          <p style="color: #374151; font-size: 16px;">It's been <strong>${data.daysSinceLastLogin} days</strong> since your last visit.</p>
          <p style="color: #6b7280;">While you were away, a lot has been happening:</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; color: #92400e;"><strong>📋 ${data.newProjectsSince}</strong> new opportunities were posted</p>
            <p style="margin: 0; color: #92400e;"><strong>🎯 ${data.missedMatches}</strong> projects matched your skills</p>
          </div>

          <p style="color: #6b7280;">NGOs are actively looking for professionals like you. Your skills can make a real difference — come back and explore what's new!</p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"}/projects" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">See What You're Missing</a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Don't want these emails? Update your <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"}/volunteer/settings" style="color: #6366f1;">notification preferences</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Zero-result search alert email to admins
export function getZeroResultAlertEmailHtml(query: string, engine: string, filters?: Record<string, any>): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"
  const filterStr = filters && Object.keys(filters).length > 0
    ? Object.entries(filters).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join("")
    : "<li>None</li>"
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
        <p style="color: #666; margin-top: 5px;">Search Analytics Alert</p>
      </div>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #dc2626;">⚠️ Zero Results Search Detected</h2>
        <p>A user searched for something that returned <strong>no results</strong>. This could indicate a content gap on the platform.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 120px;">Query</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">"${query}"</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Engine</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${engine}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Time</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date().toISOString()}</td></tr>
        </table>
        <p style="margin-bottom: 4px; font-weight: 600;">Inferred Filters:</p>
        <ul style="margin-top: 4px;">${filterStr}</ul>
        <h3 style="margin-bottom: 8px;">Possible Reasons:</h3>
        <ul>
          <li>No volunteers/NGOs/opportunities match this skill or role</li>
          <li>The search term may need to be added as a synonym</li>
          <li>A new skill category might need to be created</li>
        </ul>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${appUrl}/admin/search-analytics" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Search Analytics</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated alert from the JustBeCause platform search system.</p>
      </div>
    </body>
    </html>
  `
}

// ============================================
// MILESTONE CELEBRATION EMAIL
// ============================================
export function getMilestoneCelebrationEmailHtml(
  userName: string,
  milestone: {
    type: string
    value: number
    label: string
    nextMilestone?: number
  }
): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 24px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
          <h1 style="color: white; margin: 0; font-size: 24px;">Milestone Reached!</h1>
        </div>
        <div style="padding: 24px; text-align: center;">
          <p style="color: #374151; font-size: 18px;">Congratulations, <strong>${userName}</strong>!</p>
          
          <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 24px; border-radius: 12px; margin: 20px 0;">
            <div style="font-size: 40px; font-weight: bold; color: #059669;">${milestone.value}</div>
            <div style="font-size: 16px; color: #374151; font-weight: 500;">${milestone.label}</div>
          </div>

          <p style="color: #6b7280;">Your dedication to social impact is truly inspiring. Every project, every hour — it all adds up to meaningful change.</p>

          ${milestone.nextMilestone ? `
          <div style="background: #eff6ff; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #3b82f6; font-size: 14px;">🎯 Next milestone: <strong>${milestone.nextMilestone} ${milestone.type === "projects" ? "projects" : "hours"}</strong></p>
          </div>
          ` : ""}

          <div style="margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"}/volunteer/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Your Impact Dashboard</a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} JustBeCause Network</p>
        </div>
      </div>
    </body>
    </html>
  `
}