
"use client"

import { signIn } from "next-auth/react"
 
export default function SignIn() {
  return <button onClick={() => signIn("linkedin")}> Sign in with Linked-In</button>
}
