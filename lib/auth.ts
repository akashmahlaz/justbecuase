import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import client from "./db";
import { sendEmail, getVerificationEmailHtml, getPasswordResetEmailHtml, getPasswordResetCodeEmailHtml } from "./email";
import { passwordResetDb } from "./database";

// Determine the base URL for auth
const getAuthBaseURL = () => {
  // Explicit URL takes priority
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  // For Vercel deployments, use the project URL or custom domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

export const auth = betterAuth({
  baseURL: getAuthBaseURL(),
  database: mongodbAdapter(client.db("justbecause")),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disabled for easier signup flow
    sendResetPassword: async ({ user, url, token }) => {
      try {
        // Generate a short numeric code and store mapping to the reset token
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour
        console.log(`[Reset] ========================================`)
        console.log(`[Reset] User email: ${user.email}`)
        console.log(`[Reset] User name: ${user.name}`)
        console.log(`[Reset] Generated code: ${code}`)
        console.log(`[Reset] Token from better-auth: ${token}`)
        console.log(`[Reset] URL from better-auth: ${url}`)
        console.log(`[Reset] ========================================`)
        
        // Store the token directly (not the full URL) so we can build the redirect URL on the client
        const resetUrl = `/auth/reset-password?token=${token}`
        await passwordResetDb.create({ email: user.email, code, resetUrl, expiresAt })
        console.log(`[Reset] Code stored in DB for ${user.email} with resetUrl: ${resetUrl}`)

        // Send the code-based email (includes fallback link)
        console.log(`[Reset] Sending email to ${user.email}`)
        const emailSent = await sendEmail({
          to: user.email,
          subject: "Reset your password - JustBecause.asia",
          html: getPasswordResetCodeEmailHtml(code, url, user.name),
          text: `Use this code to reset your password: ${code}`,
        })
        console.log(`[Reset] Email send result: ${emailSent}`)
      } catch (err) {
        // Fallback: send the normal reset link if DB/email fails
        console.error(`[Reset] Error for ${user.email}:`, err)
        void sendEmail({
          to: user.email,
          subject: "Reset your password - JustBecause.asia",
          html: getPasswordResetEmailHtml(url, user.name),
          text: `Click the link to reset your password: ${url}`,
        })
      }
    },
  },
  // Social Login Providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account", // Always ask user to select account
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID as string,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
    },
  },
  // Email verification disabled for easier signup flow
  // emailVerification: {
  //   sendOnSignUp: true,
  //   autoSignInAfterVerification: true,
  //   sendVerificationEmail: async ({ user, url }) => {
  //     void sendEmail({
  //       to: user.email,
  //       subject: "Verify your email - JustBecause.asia",
  //       html: getVerificationEmailHtml(url, user.name),
  //       text: `Click the link to verify your email: ${url}`,
  //     })
  //   },
  // },
  user: {
    additionalFields: {
      // Note: 'role' is handled by the admin plugin, don't add it here
      isOnboarded: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
      },
      // Common profile fields
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      location: {
        type: "string",
        required: false,
        input: true,
      },
      city: {
        type: "string",
        required: false,
        input: true,
      },
      country: {
        type: "string",
        required: false,
        input: true,
      },
      // Volunteer-specific fields (null if NGO)
      bio: {
        type: "string",
        required: false,
        input: true,
      },
      skills: {
        type: "string", // JSON array string
        required: false,
        input: true,
      },
      experience: {
        type: "string",
        required: false,
        input: true,
      },
      availability: {
        type: "string",
        required: false,
        input: true,
      },
      languages: {
        type: "string", // JSON array string
        required: false,
        input: true,
      },
      interests: {
        type: "string", // JSON array string
        required: false,
        input: true,
      },
      linkedIn: {
        type: "string",
        required: false,
        input: true,
      },
      portfolio: {
        type: "string",
        required: false,
        input: true,
      },
      isAvailable: {
        type: "boolean",
        required: false,
        input: true,
      },
      rating: {
        type: "number",
        required: false,
      },
      completedProjects: {
        type: "number",
        required: false,
      },
      // NGO-specific fields (null if Volunteer)
      orgName: {
        type: "string",
        required: false,
        input: true,
      },
      description: {
        type: "string",
        required: false,
        input: true,
      },
      mission: {
        type: "string",
        required: false,
        input: true,
      },
      registrationNumber: {
        type: "string",
        required: false,
        input: true,
      },
      website: {
        type: "string",
        required: false,
        input: true,
      },
      address: {
        type: "string",
        required: false,
        input: true,
      },
      causes: {
        type: "string", // JSON array string
        required: false,
        input: true,
      },
      yearFounded: {
        type: "string",
        required: false,
        input: true,
      },
      teamSize: {
        type: "string",
        required: false,
        input: true,
      },
      contactPersonName: {
        type: "string",
        required: false,
        input: true,
      },
      contactEmail: {
        type: "string",
        required: false,
        input: true,
      },
      isVerified: {
        type: "boolean",
        required: false,
      },
      subscriptionTier: {
        type: "string",
        required: false,
      },
      activeProjects: {
        type: "number",
        required: false,
      },
      logo: {
        type: "string",
        required: false,
        input: true,
      },
      avatar: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    "http://localhost:3000",
    "https://justbecause.asia",
    "https://www.justbecause.asia",
    "https://justbecause.vercel.app",
    "https://justbecause-one.vercel.app",
    process.env.BETTER_AUTH_URL || "",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].filter(Boolean),
  plugins: [
    admin({
      defaultRole: "user", // Unassigned - user must select volunteer or ngo
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type UserRole = "volunteer" | "ngo" | "admin";
