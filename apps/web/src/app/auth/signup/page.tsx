'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Trophy, Users, Shield, Star, ChevronRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Zap, Target, BarChart3, Calendar, Mail, User, Lock, UserPlus } from 'lucide-react'

export default function SignUpPage() {
  const [step, setStep] = useState<'welcome' | 'form' | 'team-setup' | 'success'>('welcome')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    teamName: '',
    favoriteTeam: '',
    experience: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [isValidEmail, setIsValidEmail] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const router = useRouter()

  // Real-time validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setIsValidEmail(emailRegex.test(formData.email))
    
    if (formData.email && !emailRegex.test(formData.email)) {
      setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
    } else {
      setValidationErrors(prev => {
        const { email, ...rest } = prev
        return rest
      })
    }
  }, [formData.email])

  // Password strength calculation
  useEffect(() => {
    let strength = 0
    if (formData.password.length >= 8) strength += 25
    if (/[A-Z]/.test(formData.password)) strength += 25
    if (/[0-9]/.test(formData.password)) strength += 25
    if (/[^A-Za-z0-9]/.test(formData.password)) strength += 25
    
    setPasswordStrength(strength)
    
    if (formData.password && formData.password.length < 8) {
      setValidationErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }))
    } else {
      setValidationErrors(prev => {
        const { password, ...rest } = prev
        return rest
      })
    }
  }, [formData.password])

  // Confirm password validation
  useEffect(() => {
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setValidationErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }))
    } else {
      setValidationErrors(prev => {
        const { confirmPassword, ...rest } = prev
        return rest
      })
    }
  }, [formData.password, formData.confirmPassword])

  const handleNextStep = () => {
    if (step === 'welcome') {
      setStep('form')
    } else if (step === 'form') {
      // Validate form before proceeding
      const errors: {[key: string]: string} = {}
      
      if (!formData.name.trim()) errors.name = 'Name is required'
      if (!formData.email.trim()) errors.email = 'Email is required'
      if (!isValidEmail) errors.email = 'Please enter a valid email'
      if (!formData.password) errors.password = 'Password is required'
      if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters'
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match'
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        Object.values(errors).forEach(error => toast.error(error))
        return
      }
      
      setStep('team-setup')
    } else if (step === 'team-setup') {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          teamName: formData.teamName || `${formData.name}'s Team`,
          favoriteTeam: formData.favoriteTeam,
          experience: formData.experience
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Registration failed')
      }

      setStep('success')
      toast.success('Welcome to AstralField!')
      
      // Auto sign in after a short delay
      setTimeout(async () => {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.ok) {
          router.push('/dashboard?welcome=true')
          router.refresh()
        } else {
          router.push('/auth/signin?message=Account created, please sign in')
        }
      }, 2000)
      
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong. Please try again.')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    toast.loading('Connecting to Google...')
    signIn('google', { callbackUrl: '/dashboard?welcome=true' })
  }

  const nflTeams = [
    'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
    'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
    'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
    'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
    'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
    'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
    'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
    'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders'
  ]

  const experienceLevels = [
    { value: 'beginner', label: 'Beginner', desc: 'New to fantasy football' },
    { value: 'intermediate', label: 'Intermediate', desc: '1-3 years experience' },
    { value: 'advanced', label: 'Advanced', desc: '4+ years experience' },
    { value: 'expert', label: 'Expert', desc: 'League veteran' }
  ]

  // Welcome Step
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden px-4 py-8">
        {/* Fantasy Football Background Elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 left-4 sm:top-10 sm:left-10 text-4xl sm:text-6xl animate-bounce">🏈</div>
          <div className="absolute top-8 right-4 sm:top-20 sm:right-20 text-3xl sm:text-4xl animate-pulse">🏆</div>
          <div className="absolute bottom-16 left-4 sm:bottom-20 sm:left-20 text-4xl sm:text-5xl animate-bounce delay-1000">⭐</div>
          <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 text-2xl sm:text-3xl animate-pulse delay-500">🔥</div>
        </div>
        
        <div className="max-w-4xl w-full space-y-8 relative z-10">
          <div className="text-center space-y-6">
            <Link
              href="/auth/signin"
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400" />
                <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                  Join AstralField
                </h1>
              </div>
              
              <p className="text-xl sm:text-2xl text-gray-300 max-w-2xl mx-auto">
                The AI-powered fantasy football platform that serious players choose
              </p>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center group hover:border-blue-500 transition-all duration-300">
              <Zap className="w-10 h-10 mx-auto text-yellow-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Insights</h3>
              <p className="text-sm text-gray-400">Get smart recommendations and predictions powered by advanced AI</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center group hover:border-green-500 transition-all duration-300">
              <BarChart3 className="w-10 h-10 mx-auto text-green-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-white mb-2">Live Analytics</h3>
              <p className="text-sm text-gray-400">Real-time scoring, projections, and performance tracking</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center group hover:border-purple-500 transition-all duration-300">
              <Target className="w-10 h-10 mx-auto text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-white mb-2">Smart Drafting</h3>
              <p className="text-sm text-gray-400">AI-assisted draft recommendations and strategy optimization</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center group hover:border-blue-500 transition-all duration-300">
              <Users className="w-10 h-10 mx-auto text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-white mb-2">League Management</h3>
              <p className="text-sm text-gray-400">Complete tools for commissioners and competitive play</p>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 text-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Ready to Dominate Your League?</h2>
                <p className="text-gray-400">Join thousands of players who trust AstralField for their fantasy success</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  onClick={() => setStep('form')}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 text-lg"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Your Account
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                
                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full sm:w-auto border-slate-600 text-gray-300 hover:bg-slate-700 px-6"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign up with Google
                </Button>
              </div>
              
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success Step
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden px-4">
        <div className="max-w-md w-full text-center space-y-8 relative z-10">
          <div className="space-y-6">
            <div className="relative">
              <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-green-400/30 rounded-full animate-ping" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">Welcome to AstralField!</h1>
              <p className="text-gray-400">Your account has been created successfully</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-blue-400" />
                  <span className="text-white">{formData.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">{formData.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-300">{formData.teamName || `${formData.name}'s Team`}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Loader2 className="w-6 h-6 mx-auto text-blue-400 animate-spin" />
              <p className="text-sm text-gray-400">Preparing your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden px-4 py-8">
      {/* Fantasy Football Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 left-4 sm:top-10 sm:left-10 text-4xl sm:text-6xl animate-bounce">🏈</div>
        <div className="absolute top-8 right-4 sm:top-20 sm:right-20 text-3xl sm:text-4xl animate-pulse">🏆</div>
        <div className="absolute bottom-16 left-4 sm:bottom-20 sm:left-20 text-4xl sm:text-5xl animate-bounce delay-1000">⭐</div>
        <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 text-2xl sm:text-3xl animate-pulse delay-500">🔥</div>
      </div>
      
      <div className="max-w-md w-full space-y-4 sm:space-y-6 relative z-10">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => step === 'form' ? setStep('welcome') : setStep('form')}
            className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              step === 'form' ? 'bg-blue-400' : 'bg-slate-600'
            }`} />
            <div className={`w-2 h-2 rounded-full transition-colors ${
              step === 'team-setup' ? 'bg-blue-400' : 'bg-slate-600'
            }`} />
          </div>
        </div>
        
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              AstralField
            </h1>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {step === 'form' ? 'Create Your Account' : 'Customize Your Team'}
            </h2>
            <p className="text-sm text-gray-400">
              {step === 'form' ? 'Join the elite fantasy football experience' : 'Set up your team preferences'}
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm border border-slate-700 shadow-2xl">
          {step === 'form' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`appearance-none relative block w-full pl-10 pr-4 py-3 border rounded-lg text-white bg-slate-700 focus:outline-none focus:z-10 text-sm transition-all duration-200 ${
                      validationErrors.name 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="Enter your full name"
                  />
                </div>
                {validationErrors.name && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {validationErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`appearance-none relative block w-full pl-10 pr-10 py-3 border rounded-lg text-white bg-slate-700 focus:outline-none focus:z-10 text-sm transition-all duration-200 ${
                      validationErrors.email 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : isValidEmail && formData.email 
                          ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                          : 'border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="player@example.com"
                  />
                  {formData.email && (
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
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`appearance-none relative block w-full pl-10 pr-12 py-3 border rounded-lg text-white bg-slate-700 focus:outline-none focus:z-10 text-sm transition-all duration-200 ${
                      validationErrors.password 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-600 rounded-full h-1">
                        <div 
                          className={`h-1 rounded-full transition-all duration-300 ${
                            passwordStrength < 50 ? 'bg-red-400' : 
                            passwordStrength < 75 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                      <span className={`text-xs ${
                        passwordStrength < 50 ? 'text-red-400' : 
                        passwordStrength < 75 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Use 8+ characters with uppercase, numbers, and symbols</p>
                  </div>
                )}
                
                {validationErrors.password && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`appearance-none relative block w-full pl-10 pr-12 py-3 border rounded-lg text-white bg-slate-700 focus:outline-none focus:z-10 text-sm transition-all duration-200 ${
                      validationErrors.confirmPassword 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : formData.confirmPassword && formData.password === formData.confirmPassword
                          ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                          : 'border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>
              
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={loading || !isValidEmail || !formData.name || !formData.password || formData.password !== formData.confirmPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold transition-all duration-200"
                size="lg"
              >
                Continue to Team Setup
                <ChevronRight className="h-5 w-5 ml-2" />
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
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign up with Google
              </Button>
            </div>
          )}
          
          {step === 'team-setup' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="teamName" className="block text-sm font-medium text-gray-300">
                  Team Name
                </label>
                <div className="relative">
                  <Trophy className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-400" />
                  <input
                    id="teamName"
                    name="teamName"
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    className="appearance-none relative block w-full pl-10 pr-4 py-3 border border-slate-600 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                    placeholder={`${formData.name}'s Team`}
                  />
                </div>
                <p className="text-xs text-gray-500">Choose a unique name for your fantasy team</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Favorite NFL Team (Optional)
                </label>
                <select
                  value={formData.favoriteTeam}
                  onChange={(e) => setFormData({ ...formData, favoriteTeam: e.target.value })}
                  className="appearance-none relative block w-full px-4 py-3 border border-slate-600 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                >
                  <option value="">Select your favorite team</option>
                  {nflTeams.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Fantasy Experience Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {experienceLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, experience: level.value })}
                      className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                        formData.experience === level.value
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                          : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-medium text-sm">{level.label}</div>
                      <div className="text-xs text-gray-400">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all duration-200"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </div>
          )}
          
          <div className="mt-6 text-center space-y-3">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our{' '}
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Terms of Service</span>{' '}
              and{' '}
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Privacy Policy</span>.
            </p>
            
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Secure Registration</span>
              </div>
              <div className="w-px h-4 bg-slate-600" />
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>GDPR Compliant</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}