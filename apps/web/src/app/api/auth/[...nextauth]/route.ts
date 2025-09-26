import { handlers } from "@/lib/auth"

// Force Node.js runtime for auth functionality
export const runtime = 'nodejs'

export const { GET, POST } = handlers
