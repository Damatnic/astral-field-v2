'use client'

import { Suspense, useState, useEffect, useCallback, useMemo, useTransition, useRef } from 'react'
import { signIn, getSession, getCsrfToken } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, EyeOff, Shield, Users, Trophy, Star, ChevronRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { SkipToContent } from '@/components/auth/accessible-form-field'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'quick-pick' | 'new-player'>('form')
  const [validationErrors, setValidationErrors] = useState<{email?: string, password?: string}>({})
  const [isValidEmail, setIsValidEmail] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showOptimisticSuccess, setShowOptimisticSuccess] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'
  const isNewPlayer = searchParams?.get('new') === 'true'
  
  // Catalyst Performance: Refs for form elements
  const formRef = useRef<HTMLFormElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  
  // Catalyst Performance: Memoized values
  const memoizedCallbackUrl = useMemo(() => callbackUrl, [callbackUrl])
  const isFormLoading = useMemo(() => loading || isPending, [loading, isPending])
  
  // Catalyst Performance: Preload critical routes
  useEffect(() => {
    router.prefetch('/dashboard')
    router.prefetch('/team')
    router.prefetch('/players')
    router.prefetch('/analytics')
  }, [router])

  // Real-time email validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setIsValidEmail(emailRegex.test(email))
    if (email && !emailRegex.test(email)) {
      setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
    } else {
      setValidationErrors(prev => ({ ...prev, email: undefined }))
    }
  }, [email])

  // Password validation
  useEffect(() => {
    if (password && password.length < 6) {
      setValidationErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }))
    } else {
      setValidationErrors(prev => ({ ...prev, password: undefined }))
    }
  }, [password])

  // Catalyst Performance: Optimized submit handler with instant feedback
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!email || !password) {
      toast.error('Please fill in all fields')
      emailRef.current?.focus()
      return
    }
    
    if (!isValidEmail) {
      toast.error('Please enter a valid email address')
      emailRef.current?.focus()
      return
    }
    
    setLoading(true)
    setShowOptimisticSuccess(true) // Instant visual feedback
    
    // Catalyst Performance: Use transition for non-blocking UI updates
    startTransition(async () => {
      try {
        const startTime = Date.now()
        
        // Catalyst Performance: Get CSRF token and perform authentication
        const csrfToken = await getCsrfToken()
        
        const [authResult] = await Promise.all([
          signIn('credentials', {
            email: email.toLowerCase().trim(),
            password,
            redirect: false,
            csrfToken,
          }),
          // Preload next page while authenticating
          router.prefetch(memoizedCallbackUrl),
        ])
        
        const authTime = Date.now() - startTime

        if (authResult?.error) {
          setShowOptimisticSuccess(false)
          
          // Enhanced error messages with performance metrics
          switch (authResult.error) {
            case 'CredentialsSignin':
              toast.error('Invalid email or password. Please check your credentials and try again.', {
                description: `Authentication completed in ${authTime}ms`
              })
              break
            case 'INVALID_CREDENTIALS':
              toast.error('Account not found. Would you like to create a new account?', {
                description: `Verified in ${authTime}ms`
              })
              break
            default:
              toast.error('Login failed. Please try again.', {
                description: `Response time: ${authTime}ms`
              })
          }
          emailRef.current?.focus()
        } else {
          // Success - wait for session to be established
          let retries = 0
          const maxRetries = 5
          
          const checkSession = async () => {
            const session = await getSession()
            if (session?.user || retries >= maxRetries) {
              const playerName = session?.user?.name || 'Player'
              toast.success(`Welcome back, ${playerName}! Ready to dominate?`, {
                description: `Signed in successfully in ${authTime}ms`
              })
              
              // Force hard navigation to ensure redirect
              window.location.href = memoizedCallbackUrl
              return
            }
            
            retries++
            setTimeout(checkSession, 200) // Check again in 200ms
          }
          
          checkSession()
        }
      } catch (error) {
        setShowOptimisticSuccess(false)
        toast.error('Connection error. Please check your internet and try again.')
        console.error('Login error:', error)
      } finally {
        setLoading(false)
      }
    })
  }, [email, password, isValidEmail, memoizedCallbackUrl, router, startTransition])

  // Catalyst Performance: Optimized Google sign-in
  const handleGoogleSignIn = useCallback(() => {
    setLoading(true)
    toast.loading('Connecting to Google...')
    
    // Preload app routes before OAuth redirect
    router.prefetch('/dashboard')
    router.prefetch('/team')
    
    signIn('google', { callbackUrl: memoizedCallbackUrl })
  }, [memoizedCallbackUrl, router])
  
  // Guardian Security: Secure quick login handler
  const handleQuickLogin = useCallback(async (accountEmail: string) => {
    setLoading(true)
    setShowOptimisticSuccess(true)
    
    startTransition(async () => {
      try {
        const startTime = Date.now()
        
        // Guardian Security: Get credentials from secure API
        const quickLoginResponse = await fetch('/api/auth/quick-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: accountEmail }),
        })
        
        if (!quickLoginResponse.ok) {
          const errorData = await quickLoginResponse.json()
          setShowOptimisticSuccess(false)
          
          if (quickLoginResponse.status === 429) {
            toast.error('Too many quick login attempts. Please wait and try again.', {
              description: `Try again in ${errorData.retryAfter} seconds`
            })
          } else {
            toast.error('Quick login unavailable. Please use manual login.', {
              description: errorData.message || 'Unknown error'
            })
          }
          return
        }
        
        const { user, sessionToken } = await quickLoginResponse.json()
        
        // Guardian Security: Get credentials for authentication
        const credentialsResponse = await fetch('/api/auth/verify-quick-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: accountEmail,
            sessionToken 
          }),
        })
        
        if (!credentialsResponse.ok) {
          setShowOptimisticSuccess(false)
          toast.error('Quick login verification failed. Please use manual login.')
          return
        }
        
        const { credentials } = await credentialsResponse.json()
        
        // Set form values for user visibility
        setEmail(credentials.email)
        setPassword('••••••••••••')
        
        // Perform authentication
        const csrfToken = await getCsrfToken()
        
        const [authResult] = await Promise.all([
          signIn('credentials', {
            email: credentials.email,
            password: credentials.password,
            redirect: false,
            csrfToken,
          }),
          router.prefetch(memoizedCallbackUrl),
        ])
        
        const authTime = Date.now() - startTime

        if (authResult?.error) {
          setShowOptimisticSuccess(false)
          toast.error('Quick login failed. Please try manual login.', {
            description: `Response time: ${authTime}ms`
          })
        } else {
          // Success - wait for session then redirect
          let retries = 0
          const maxRetries = 5
          
          const checkSession = async () => {
            const session = await getSession()
            if (session?.user || retries >= maxRetries) {
              const playerName = session?.user?.name || user.name || 'Player'
              toast.success(`Welcome back, ${playerName}! Ready to dominate?`, {
                description: `Secure quick login in ${authTime}ms`
              })
              
              window.location.href = memoizedCallbackUrl
              return
            }
            
            retries++
            setTimeout(checkSession, 200)
          }
          
          checkSession()
        }
      } catch (error) {
        setShowOptimisticSuccess(false)
        toast.error('Connection error. Please try manual login.')
        console.error('Secure quick login error:', error)
      } finally {
        setLoading(false)
      }
    })
  }, [memoizedCallbackUrl, router, startTransition])
  
  // Catalyst Performance: Optimized input handlers
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
  }, [])
  
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
  }, [])

  // Use the optimized handleQuickLogin from above

  if (step === 'new-player') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Fantasy Football Background Elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 text-6xl">🏈</div>
          <div className="absolute top-20 right-20 text-4xl">🏆</div>
          <div className="absolute bottom-20 left-20 text-5xl">⭐</div>
          <div className="absolute bottom-10 right-10 text-3xl">🔥</div>
        </div>
        
        <div className="max-w-lg w-full space-y-8 p-8 relative z-10">
          <div className="text-center space-y-6">
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>
            
            <div className="space-y-2">
              <Trophy className="w-16 h-16 mx-auto text-yellow-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                Welcome to AstralField
              </h1>
              <p className="text-xl text-gray-300">Join the ultimate fantasy football experience</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <Users className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                <h3 className="font-semibold text-white">10 Player League</h3>
                <p className="text-sm text-gray-400">Perfect competitive size</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <Shield className="w-8 h-8 mx-auto text-green-400 mb-2" />
                <h3 className="font-semibold text-white">Secure & Fair</h3>
                <p className="text-sm text-gray-400">Advanced anti-cheat</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <Star className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
                <h3 className="font-semibold text-white">AI Powered</h3>
                <p className="text-sm text-gray-400">Smart recommendations</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button
                onClick={() => router.push('/auth/signup')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-lg"
                size="lg"
              >
                Create Your Team
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <button
                  onClick={() => setStep('form')}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <SkipToContent />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden px-4 py-8">
      {/* Fantasy Football Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 left-4 sm:top-10 sm:left-10 text-4xl sm:text-6xl animate-bounce">🏈</div>
        <div className="absolute top-8 right-4 sm:top-20 sm:right-20 text-3xl sm:text-4xl animate-pulse">🏆</div>
        <div className="absolute bottom-16 left-4 sm:bottom-20 sm:left-20 text-4xl sm:text-5xl animate-bounce delay-1000">⭐</div>
        <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 text-2xl sm:text-3xl animate-pulse delay-500">🔥</div>
      </div>
      
      <main id="main-content" className="max-w-md w-full space-y-4 sm:space-y-6 relative z-10">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              AstralField
            </h1>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              Welcome Back, Player!
            </h2>
            <p className="text-gray-400">
              Ready to dominate your league?
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400">10 Players</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-gray-400">Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-400">AI Powered</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700 shadow-2xl">
          {step === 'quick-pick' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Quick Player Select</h3>
                <button
                  onClick={() => setStep('form')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Manual Login
                </button>
              </div>
              
              <p className="text-sm text-gray-400 mb-4">
                🏈 D'Amato Dynasty League - Select your player profile:
              </p>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[
                  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", team: "D'Amato Dynasty", role: "Commissioner", color: "from-yellow-500 to-orange-500" },
                  { name: "Nick Hartley", email: "nick@damato-dynasty.com", team: "Hartley's Heroes", role: "Player", color: "from-blue-500 to-cyan-500" },
                  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", team: "McCaigue Mayhem", role: "Player", color: "from-red-500 to-pink-500" },
                  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", team: "Larry Legends", role: "Player", color: "from-green-500 to-emerald-500" },
                  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", team: "Renee's Reign", role: "Player", color: "from-purple-500 to-violet-500" },
                  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", team: "Kornbeck Crushers", role: "Player", color: "from-indigo-500 to-blue-500" },
                  { name: "David Jarvey", email: "david@damato-dynasty.com", team: "Jarvey's Juggernauts", role: "Player", color: "from-teal-500 to-cyan-500" },
                  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", team: "Lorbecki Lions", role: "Player", color: "from-pink-500 to-rose-500" },
                  { name: "Cason Minor", email: "cason@damato-dynasty.com", team: "Minor Miracles", role: "Player", color: "from-amber-500 to-yellow-500" },
                  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", team: "Bergum Blitz", role: "Player", color: "from-lime-500 to-green-500" }
                ].map((account, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickLogin(account.email)}
                    disabled={isFormLoading}
                    className="w-full text-left p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-blue-500 hover:bg-slate-700 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${account.color}`} />
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                            {account.name}
                          </div>
                          <div className="text-xs text-blue-400">{account.team}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {account.role === 'Commissioner' && <Trophy className="w-4 h-4 text-yellow-400" />}
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="pt-4 border-t border-slate-600">
                <Button
                  onClick={() => setStep('new-player')}
                  variant="outline"
                  className="w-full"
                >
                  New Player? Join the League
                </Button>
              </div>
            </div>
          )}
          
          {step === 'form' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Player Login</h3>
                <button
                  onClick={() => setStep('quick-pick')}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                >
                  <Users className="w-4 h-4" />
                  <span>Quick Select</span>
                </button>
              </div>
              
              <form ref={formRef} id="signin-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      ref={emailRef}
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      disabled={isFormLoading}
                      className={`appearance-none relative block w-full px-4 py-3 border rounded-lg text-white bg-slate-700 focus:outline-none focus:z-10 sm:text-sm transition-all duration-200 ${
                        validationErrors.email 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : isValidEmail && email 
                            ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                            : 'border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="player@example.com"
                    />
                    {email && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {isValidEmail ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {validationErrors.email && (
                    <p className="text-red-400 text-xs mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={handlePasswordChange}
                      disabled={isFormLoading}
                      className={`appearance-none relative block w-full px-4 py-3 pr-12 border rounded-lg text-white bg-slate-700 focus:outline-none focus:z-10 sm:text-sm transition-all duration-200 ${
                        validationErrors.password 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-red-400 text-xs mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                      Remember me
                    </label>
                  </div>
                  <div className="text-sm">
                    <span className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">
                      Forgot password?
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isFormLoading || !isValidEmail || !password}
                  className={`w-full font-semibold transition-all duration-300 ${
                    showOptimisticSuccess 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  } disabled:from-gray-600 disabled:to-gray-700 text-white`}
                  size="lg"
                  style={{
                    transform: isFormLoading ? 'scale(0.98)' : 'scale(1)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {isFormLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      <span>
                        {showOptimisticSuccess ? 'Signing you in...' : 'Processing...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      Enter the Field
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-slate-800 text-gray-400">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full border-slate-600 text-gray-300 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200"
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
            </div>
          )}

          
          <div className="mt-6 text-center space-y-4">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Terms of Service</span>{' '}
              and{' '}
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Privacy Policy</span>.
            </p>
            
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Secure Login</span>
              </div>
              <div className="w-px h-4 bg-slate-600" />
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>GDPR Compliant</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-400">
              New to fantasy football?{' '}
              <button
                onClick={() => setStep('new-player')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Learn more about AstralField
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
    </>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}