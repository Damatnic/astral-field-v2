'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertCircle, Home, RefreshCw, Mail, Shield, ArrowLeft, HelpCircle } from 'lucide-react'

const errorMessages = {
  Configuration: {
    title: "Configuration Error",
    message: "There's a configuration issue with the authentication system.",
    suggestion: "Please contact support if this problem persists.",
    icon: AlertCircle,
    color: "text-red-400"
  },
  AccessDenied: {
    title: "Access Denied",
    message: "You don't have permission to access this resource.",
    suggestion: "Please contact your league commissioner for access.",
    icon: Shield,
    color: "text-yellow-400"
  },
  Verification: {
    title: "Email Verification Required",
    message: "Please verify your email address to continue.",
    suggestion: "Check your inbox for a verification email.",
    icon: Mail,
    color: "text-blue-400"
  },
  Default: {
    title: "Authentication Error",
    message: "Something went wrong during authentication.",
    suggestion: "Please try signing in again.",
    icon: AlertCircle,
    color: "text-red-400"
  },
  CredentialsSignin: {
    title: "Invalid Credentials",
    message: "The email or password you entered is incorrect.",
    suggestion: "Double-check your credentials and try again.",
    icon: AlertCircle,
    color: "text-red-400"
  },
  EmailNotVerified: {
    title: "Email Not Verified",
    message: "Your email address hasn't been verified yet.",
    suggestion: "Please verify your email with your OAuth provider.",
    icon: Mail,
    color: "text-blue-400"
  }
}

function AuthErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams?.get('error') || 'Default'
  
  const errorInfo = errorMessages[error as keyof typeof errorMessages] || errorMessages.Default
  const IconComponent = errorInfo.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden px-4">
      {/* Fantasy Football Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl">🏈</div>
        <div className="absolute top-20 right-20 text-4xl">🏆</div>
        <div className="absolute bottom-20 left-20 text-5xl">⭐</div>
        <div className="absolute bottom-10 right-10 text-3xl">🔥</div>
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className={`p-4 rounded-full bg-slate-800/50 border border-slate-700`}>
                <IconComponent className={`w-12 h-12 ${errorInfo.color}`} />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">
                {errorInfo.title}
              </h1>
              <p className="text-gray-400">
                {errorInfo.message}
              </p>
            </div>
          </div>

          {/* Error Details Card */}
          <div className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700 space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 text-left">What happened?</h3>
              <p className="text-sm text-gray-400 text-left">
                {errorInfo.suggestion}
              </p>
            </div>

            {error === 'CredentialsSignin' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <HelpCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-blue-300">Need help?</h4>
                    <ul className="text-xs text-blue-200 space-y-1">
                      <li>• Make sure your email is correct</li>
                      <li>• Check if Caps Lock is on</li>
                      <li>• Try the "Quick Player Select" option</li>
                      <li>• Contact your league commissioner</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {error === 'EmailNotVerified' && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-yellow-300">Email Verification</h4>
                    <p className="text-xs text-yellow-200">
                      Check your email inbox and spam folder for a verification link from your OAuth provider (Google, etc.).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
              size="lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Try Again
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => router.push('/auth/signin?step=quick-pick')}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:border-slate-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Quick Login
              </Button>

              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:border-slate-500"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>

          {/* Support Information */}
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300">Still having trouble?</h4>
              <p className="text-xs text-gray-400">
                Contact your league commissioner or reach out to our support team for assistance.
              </p>
              <div className="flex items-center justify-center space-x-4 pt-2">
                <Button
                  onClick={() => router.push('/auth/signup')}
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300 hover:bg-slate-700/50"
                >
                  Create Account
                </Button>
                <div className="w-px h-4 bg-slate-600" />
                <Link
                  href="mailto:support@astralfield.com"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}