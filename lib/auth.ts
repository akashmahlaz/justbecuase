import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import client from "./db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : "http://localhost:3000",
  database: mongodbAdapter(client.db("justbecause")),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "volunteer", // "volunteer" | "ngo" | "admin"
      },
      isOnboarded: {
        type: "boolean",
        required: false,
        defaultValue: false,
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
    "https://justbecause.vercel.app",
    "https://justbecause-one.vercel.app",
    "https://*.vercel.app", // Allow all Vercel preview URLs
  ],
  plugins: [
    admin(), // Enables admin functionality
  ],
});

export type Session = typeof auth.$Infer.Session;
export type UserRole = "volunteer" | "ngo" | "admin";
