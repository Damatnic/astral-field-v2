import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      teamName: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: UserRole
    teamName: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    teamName: string | null
  }
}