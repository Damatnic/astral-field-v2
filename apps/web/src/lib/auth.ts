import NextAuth from "next-auth"
import { authConfig } from "./auth-config"

// Force Node.js runtime for bcrypt compatibility
export const runtime = 'nodejs'

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)