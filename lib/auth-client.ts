import { createAuthClient } from "better-auth/react";

// Auto-detect base URL based on environment
const getBaseURL = () => {
  // In browser, use window.location.origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  
  // In server-side, use NEXT_PUBLIC_APP_URL or VERCEL_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
