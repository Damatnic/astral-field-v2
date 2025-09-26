'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid email or password')
      } else {
        toast.success('Welcome back!')
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AstralField
          </h1>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Or{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300">
              create a new account
            </Link>
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-8 backdrop-blur-sm border border-slate-700">
          <form id="signin-form" className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-gray-500 text-white bg-slate-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-gray-500 text-white bg-slate-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
                  Forgot your password?
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <div className="loading-spinner h-5 w-5" />
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800 text-gray-400">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        {/* D'Amato Dynasty League Quick Signin */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">🏈 D'Amato Dynasty League (Password: Dynasty2025!)</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", team: "D'Amato Dynasty", role: "Commissioner" },
              { name: "Nick Hartley", email: "nick@damato-dynasty.com", team: "Hartley's Heroes", role: "Player" },
              { name: "Jack McCaigue", email: "jack@damato-dynasty.com", team: "McCaigue Mayhem", role: "Player" },
              { name: "Larry McCaigue", email: "larry@damato-dynasty.com", team: "Larry Legends", role: "Player" },
              { name: "Renee McCaigue", email: "renee@damato-dynasty.com", team: "Renee's Reign", role: "Player" },
              { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", team: "Kornbeck Crushers", role: "Player" },
              { name: "David Jarvey", email: "david@damato-dynasty.com", team: "Jarvey's Juggernauts", role: "Player" },
              { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", team: "Lorbecki Lions", role: "Player" },
              { name: "Cason Minor", email: "cason@damato-dynasty.com", team: "Minor Miracles", role: "Player" },
              { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", team: "Bergum Blitz", role: "Player" }
            ].map((account, index) => (
              <button
                key={index}
                onClick={() => {
                  setEmail(account.email);
                  setPassword('Dynasty2025!');
                  // Auto-submit the form
                  const form = document.getElementById('signin-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                className="text-left p-2 bg-slate-700/50 rounded border border-slate-600 hover:border-blue-500 hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">{account.name}</div>
                    <div className="text-xs text-blue-400">{account.team}</div>
                  </div>
                  <div className="text-xs text-gray-500">{account.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}