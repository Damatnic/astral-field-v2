import { handlers } from "@/lib/auth"

export const dynamic = 'force-dynamic'


// Force Node.js runtime for auth functionality
export const runtime = 'nodejs'

export const { GET, POST } = handlers
