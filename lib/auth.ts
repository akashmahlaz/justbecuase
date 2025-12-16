import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import client from "./db";
import { sendEmail, getVerificationEmailHtml, getPasswordResetEmailHtml } from "./email";

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
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your password - JustBecause.asia",
        html: getPasswordResetEmailHtml(url, user.name),
        text: `Click the link to reset your password: ${url}`,
      })
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
