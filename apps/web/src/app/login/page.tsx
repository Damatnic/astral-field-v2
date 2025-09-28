import { redirect } from 'next/navigation'

// Catalyst: Fix hydration errors by providing proper login route redirect
export default function LoginPage() {
  // Redirect to the correct signin page to avoid 404 errors
  redirect('/auth/signin')
}