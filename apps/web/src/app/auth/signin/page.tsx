'use client'

import { Suspense, useState, useEffect, useCallback, useMemo, useTransition, useRef } from 'react'
import { signIn, getSession, getCsrfToken } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, EyeOff, Shield, Trophy, Star, ChevronRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Crown, Zap, Target } from 'lucide-react'
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
  
  const formRef = useRef<HTMLFormElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  
  const memoizedCallbackUrl = useMemo(() => callbackUrl, [callbackUrl])
  const isFormLoading = useMemo(() => loading || isPending, [loading, isPending])
  
  useEffect(() => {
    router.prefetch('/dashboard')
    router.prefetch('/team')
    router.prefetch('/players')
    router.prefetch('/analytics')
  }, [router])

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setIsValidEmail(emailRegex.test(email))
    if (email && !emailRegex.test(email)) {
      setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
    } else {
      setValidationErrors(prev => ({ ...prev, email: undefined }))
    }
  }, [email])

  useEffect(() => {
    if (password && password.length < 6) {
      setValidationErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }))
    } else {
      setValidationErrors(prev => ({ ...prev, password: undefined }))
    }
  }, [password])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
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
    setShowOptimisticSuccess(true)
    
    startTransition(async () => {
      try {
        const startTime = Date.now()
        const csrfToken = await getCsrfToken()
        
        const [authResult] = await Promise.all([
          signIn('credentials', {
            email: email.toLowerCase().trim(),
            password,
            redirect: false,
            csrfToken,
          }),
          router.prefetch(memoizedCallbackUrl),
        ])
        
        const authTime = Date.now() - startTime

        if (authResult?.error) {
          setShowOptimisticSuccess(false)
          
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
          let retries = 0
          const maxRetries = 5
          
          const checkSession = async () => {
            const session = await getSession()
            if (session?.user || retries >= maxRetries) {
              const playerName = session?.user?.name || 'Champion'
              toast.success(`Welcome back, ${playerName}! 🏆`, {
                description: `Signed in successfully in ${authTime}ms`
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
        toast.error('Connection error. Please check your internet and try again.')
        console.error('Login error:', error)
      } finally {
        setLoading(false)
      }
    })
  }, [email, password, isValidEmail, memoizedCallbackUrl, router, startTransition])

  const handleGoogleSignIn = useCallback(() => {
    setLoading(true)
    toast.loading('Connecting to Google...')
    
    router.prefetch('/dashboard')
    router.prefetch('/team')
    
    signIn('google', { callbackUrl: memoizedCallbackUrl })
  }, [memoizedCallbackUrl, router])
  
  const handleQuickLogin = useCallback(async (accountEmail: string) => {
    setLoading(true)
    setShowOptimisticSuccess(true)
    
    startTransition(async () => {
      try {
        const startTime = Date.now()
        
        const quickLoginResponse = await fetch('/api/auth/quick-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        
        const credentialsResponse = await fetch('/api/auth/verify-quick-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: accountEmail, sessionToken }),
        })
        
        if (!credentialsResponse.ok) {
          setShowOptimisticSuccess(false)
          toast.error('Quick login verification failed. Please use manual login.')
          return
        }
        
        const { credentials } = await credentialsResponse.json()
        
        setEmail(credentials.email)
        setPassword('••••••••••••')
        
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
          let retries = 0
          const maxRetries = 5
          
          const checkSession = async () => {
            const session = await getSession()
            if (session?.user || retries >= maxRetries) {
              const playerName = session?.user?.name || user.name || 'Champion'
              toast.success(`Welcome back, ${playerName}! 🏆`, {
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
  
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }, [])
  
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }, [])

  if (step === 'new-player') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>
        
        <div className="max-w-2xl w-full space-y-8 p-8 relative z-10">
          <div className="text-center space-y-6">
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>
            
            <div className="space-y-4">
              <div className="relative inline-block">
                <Trophy className="w-20 h-20 mx-auto text-yellow-400 animate-bounce" />
                <div className="absolute inset-0 blur-2xl bg-yellow-400/30" />
              </div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Welcome to AstralField
              </h1>
              <p className="text-2xl text-slate-300 font-semibold">The ultimate fantasy football experience</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              <div className="group bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all">
                <div className="relative inline-block mb-4">
                  <Zap className="w-10 h-10 text-blue-400" />
                  <div className="absolute inset-0 blur-xl bg-blue-400/30 group-hover:bg-blue-400/50 transition-colors" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">AI-Powered Insights</h3>
                <p className="text-sm text-slate-400">Get champion-level advice instantly</p>
              </div>
              <div className="group bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-green-500/50 transition-all">
                <div className="relative inline-block mb-4">
                  <Shield className="w-10 h-10 text-green-400" />
                  <div className="absolute inset-0 blur-xl bg-green-400/30 group-hover:bg-green-400/50 transition-colors" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">Secure & Fair</h3>
                <p className="text-sm text-slate-400">Bank-level security, zero tolerance for cheating</p>
              </div>
              <div className="group bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-purple-500/50 transition-all">
                <div className="relative inline-block mb-4">
                  <Star className="w-10 h-10 text-yellow-400" />
                  <div className="absolute inset-0 blur-xl bg-yellow-400/30 group-hover:bg-yellow-400/50 transition-colors" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">Real-Time Updates</h3>
                <p className="text-sm text-slate-400">Lightning-fast scoring and notifications</p>
              </div>
            </div>
            
            <div className="space-y-4 pt-8">
              <Button
                onClick={() => router.push('/auth/signup')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-6 text-lg shadow-2xl shadow-blue-500/30"
                size="lg"
              >
                <Crown className="w-5 h-5 mr-2" />
                Create Your Championship Team
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              
              <p className="text-sm text-slate-400">
                Already dominating a league?{' '}
                <button
                  onClick={() => setStep('form')}
                  className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    )
  }

  return (
    <>
      <SkipToContent />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-8">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
          
          {/* Stadium lights effect */}
          <div className="absolute top-10 left-1/4 w-2 h-32 bg-gradient-to-b from-white/20 to-transparent blur-sm" />
          <div className="absolute top-10 right-1/4 w-2 h-32 bg-gradient-to-b from-white/20 to-transparent blur-sm" />
        </div>
        
        <main id="main-content" className="max-w-md w-full space-y-6 relative z-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <Link href="/" className="flex items-center justify-center space-x-3 group">
                <div className="relative">
                  <Trophy className="w-12 h-12 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 blur-2xl bg-yellow-400/50" />
                </div>
                <span className="text-3xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AstralField
                </span>
              </Link>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white">
                Welcome Back, Champion! 🏆
              </h2>
              <p className="text-slate-400">
                Ready to dominate your league?
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">AI-Powered</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-slate-400">Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-400">Real-Time</span>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-3xl p-8 backdrop-blur-xl border border-slate-700 shadow-2xl">
            {step === 'quick-pick' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-400" />
                    Quick Player Select
                  </h3>
                  <button
                    onClick={() => setStep('form')}
                    className="text-blue-400 hover:text-blue-300 text-sm font-semibold"
                  >
                    Manual Login
                  </button>
                </div>
                
                <p className="text-sm text-slate-400">
                  🏈 D'Amato Dynasty League - Select your player profile:
                </p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {[
                    { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", team: "D'Amato Dynasty", role: "Commissioner", color: "from-yellow-500 to-orange-500", icon: Crown },
                    { name: "Nick Hartley", email: "nick@damato-dynasty.com", team: "Hartley's Heroes", role: "Player", color: "from-blue-500 to-cyan-500", icon: Trophy },
                    { name: "Jack McCaigue", email: "jack@damato-dynasty.com", team: "McCaigue Mayhem", role: "Player", color: "from-red-500 to-pink-500", icon: Trophy },
                    { name: "Larry McCaigue", email: "larry@damato-dynasty.com", team: "Larry Legends", role: "Player", color: "from-green-500 to-emerald-500", icon: Trophy },
                    { name: "Renee McCaigue", email: "renee@damato-dynasty.com", team: "Renee's Reign", role: "Player", color: "from-purple-500 to-violet-500", icon: Trophy },
                    { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", team: "Kornbeck Crushers", role: "Player", color: "from-indigo-500 to-blue-500", icon: Trophy },
                    { name: "David Jarvey", email: "david@damato-dynasty.com", team: "Jarvey's Juggernauts", role: "Player", color: "from-teal-500 to-cyan-500", icon: Trophy },
                    { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", team: "Lorbecki Lions", role: "Player", color: "from-pink-500 to-rose-500", icon: Trophy },
                    { name: "Cason Minor", email: "cason@damato-dynasty.com", team: "Minor Miracles", role: "Player", color: "from-amber-500 to-yellow-500", icon: Trophy },
                    { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", team: "Bergum Blitz", role: "Player", color: "from-lime-500 to-green-500", icon: Trophy }
                  ].map((account, index) => {
                    const IconComponent = account.icon
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuickLogin(account.email)}
                        disabled={isFormLoading}
                        className="w-full text-left p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${account.color} flex items-center justify-center`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                                {account.name}
                              </div>
                              <div className="text-xs text-blue-400 font-medium">{account.team}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    )
                  })}
                </div>
                
                <div className="pt-4 border-t border-slate-700">
                  <Button
                    onClick={() => setStep('new-player')}
                    variant="outline"
                    className="w-full border-slate-600 hover:border-blue-500 hover:bg-slate-800"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    New Player? Join the League
                  </Button>
                </div>
              </div>
            )}
            
            {step === 'form' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Player Login</h3>
                  <button
                    onClick={() => setStep('quick-pick')}
                    className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center space-x-1"
                  >
                    <Target className="w-4 h-4" />
                    <span>Quick Select</span>
                  </button>
                </div>
                
                <form ref={formRef} id="signin-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-300">
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
                        className={`appearance-none relative block w-full px-4 py-3.5 border rounded-xl text-white bg-slate-800/50 focus:outline-none focus:z-10 sm:text-sm transition-all duration-200 ${
                          validationErrors.email 
                            ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-500' 
                            : isValidEmail && email 
                              ? 'border-green-500/50 focus:ring-2 focus:ring-green-500/50 focus:border-green-500'
                              : 'border-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                        }`}
                        placeholder="champion@example.com"
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
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-300">
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
                        className={`appearance-none relative block w-full px-4 py-3.5 pr-12 border rounded-xl text-white bg-slate-800/50 focus:outline-none focus:z-10 sm:text-sm transition-all duration-200 ${
                          validationErrors.password 
                            ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-500' 
                            : 'border-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300"
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
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-800"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-300">
                        Remember me
                      </label>
                    </div>
                    <div className="text-sm">
                      <span className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors font-semibold">
                        Forgot password?
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isFormLoading || !isValidEmail || !password}
                    className={`w-full font-bold py-6 text-base transition-all duration-300 ${
                      showOptimisticSuccess 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    } disabled:from-gray-600 disabled:to-gray-700 text-white shadow-2xl shadow-blue-500/30`}
                    size="lg"
                  >
                    {isFormLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        <span>
                          {showOptimisticSuccess ? 'Signing you in...' : 'Processing...'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <Trophy className="h-5 w-5 mr-2" />
                        Enter the Field
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-gradient-to-r from-slate-900 to-slate-800 text-slate-400 font-semibold">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    className="w-full border-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 py-6"
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

            
            <div className="mt-8 text-center space-y-4">
              <p className="text-xs text-slate-500">
                By signing in, you agree to our{' '}
                <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Terms of Service</span>{' '}
                and{' '}
                <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Privacy Policy</span>.
              </p>
              
              <div className="flex items-center justify-center space-x-4 text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>Bank-Level Security</span>
                </div>
                <div className="w-px h-4 bg-slate-700" />
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>GDPR Compliant</span>
                </div>
              </div>
              
              <p className="text-sm text-slate-400">
                New to fantasy football?{' '}
                <button
                  onClick={() => setStep('new-player')}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  Learn more about AstralField
                </button>
              </p>
            </div>
          </div>
        </main>

        <style jsx>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(51, 65, 85, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(100, 116, 139, 0.5);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 116, 139, 0.7);
          }
        `}</style>
      </div>
    </>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
