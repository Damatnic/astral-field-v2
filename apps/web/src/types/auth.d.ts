import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      sub?: string
      role?: string
      teamName?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role?: string
    teamName?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role?: string
    teamName?: string
  }
}