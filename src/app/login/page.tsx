'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Users,
  Crown,
  Shield,
  UserCircle
} from 'lucide-react';

// Profile selection interface
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'commissioner' | 'player';
  avatar?: string;
  description: string;
}

// Real 2025 NFL Season Week 3 Users - Astral Field Championship League 2025
const userProfiles: UserProfile[] = [
  // Commissioner - Gets strategic advantage
  {
    id: 'nicholas-damato',
    name: 'Nicholas D\'Amato',
    email: 'nicholas.damato@astralfield.com',
    role: 'commissioner',
    avatar: '/api/avatars/nicholas-damato',
    description: '🏆 League Commissioner - Championship Team Owner'
  },
  // League Members
  {
    id: 'brittany-bergum',
    name: 'Brittany Bergum',
    email: 'brittany.bergum@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/brittany-bergum',
    description: 'Fantasy Football Strategist'
  },
  {
    id: 'cason-minor',
    name: 'Cason Minor',
    email: 'cason.minor@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/cason-minor',
    description: 'Rising Fantasy Star'
  },
  {
    id: 'david-jarvey',
    name: 'David Jarvey',
    email: 'david.jarvey@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/david-jarvey',
    description: 'Veteran League Member'
  },
  {
    id: 'jack-mccaigue',
    name: 'Jack McCaigue',
    email: 'jack.mccaigue@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/jack-mccaigue',
    description: 'Fantasy Analytics Expert'
  },
  {
    id: 'jon-kornbeck',
    name: 'Jon Kornbeck',
    email: 'jon.kornbeck@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/jon-kornbeck',
    description: 'Trade Specialist'
  },
  {
    id: 'kaity-lorbecki',
    name: 'Kaity Lorbecki',
    email: 'kaity.lorbecki@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/kaity-lorbecki',
    description: 'Waiver Wire Expert'
  },
  {
    id: 'larry-mccaigue',
    name: 'Larry McCaigue',
    email: 'larry.mccaigue@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/larry-mccaigue',
    description: 'Season Veteran'
  },
  {
    id: 'nick-hartley',
    name: 'Nick Hartley',
    email: 'nick.hartley@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/nick-hartley',
    description: 'Rookie Sensation'
  },
  {
    id: 'renee-mccaigue',
    name: 'Renee McCaigue',
    email: 'renee.mccaigue@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/renee-mccaigue',
    description: 'Championship Contender'
  }
];

// Role icon component
function RoleIcon({ role, className = "h-5 w-5" }: { role: string; className?: string }) {
  switch (role) {
    case 'admin':
      return <Shield className={`${className} text-red-600`} />;
    case 'commissioner':
      return <Crown className={`${className} text-yellow-600`} />;
    case 'player':
      return <Users className={`${className} text-blue-600`} />;
    default:
      return <UserCircle className={`${className} text-gray-600`} />;
  }
}

// Profile selection component
function ProfileSelection({ onSelect }: { onSelect: (profile: UserProfile) => void }) {
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const filteredProfiles = selectedRole === 'all' 
    ? userProfiles 
    : userProfiles.filter(profile => profile.role === selectedRole);

  const roleOptions = [
    { value: 'all', label: 'All Roles', count: userProfiles.length },
    { value: 'admin', label: 'Administrators', count: userProfiles.filter(p => p.role === 'admin').length },
    { value: 'commissioner', label: 'Commissioners', count: userProfiles.filter(p => p.role === 'commissioner').length },
    { value: 'player', label: 'Players', count: userProfiles.filter(p => p.role === 'player').length }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Profile</h2>
        <p className="text-gray-600">
          Select your user profile to access your team in the 2025 NFL Season Week 3.
        </p>
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2">
        {roleOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedRole(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedRole === option.value
                ? 'bg-primary-100 text-primary-900 border border-primary-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {option.label} ({option.count})
          </button>
        ))}
      </div>

      {/* Profile grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onSelect(profile)}
            className="group text-left p-6 rounded-xl border border-gray-200/80 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-1 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {profile.avatar ? (
                  <Image
                    className="h-12 w-12 rounded-full object-cover"
                    src={profile.avatar}
                    alt={profile.name}
                    width={48}
                    height={48}
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center ${profile.avatar ? 'hidden' : ''}`}>
                  <UserCircle className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {profile.name}
                  </h3>
                  <RoleIcon role={profile.role} className="h-4 w-4" />
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {profile.email}
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {profile.description}
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  profile.role === 'admin'
                    ? 'bg-red-100 text-red-800'
                    : profile.role === 'commissioner'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Traditional login form component
function LoginForm({ 
  onSubmit, 
  isLoading, 
  error 
}: { 
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData.email, formData.password);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Manual Login</h2>
        <p className="text-gray-600">
          Enter your league member credentials to access your team.
        </p>
      </div>

      {/* Login credentials info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">🏈 2025 NFL Season Week 3 - Login Info</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>League Members:</strong></p>
          <p>• Nicholas D&apos;Amato (Commissioner) - nicholas.damato@astralfield.com</p>
          <p>• Brittany Bergum - brittany.bergum@astralfield.com</p>
          <p>• Cason Minor - cason.minor@astralfield.com</p>
          <p>• David Jarvey - david.jarvey@astralfield.com</p>
          <p>• Jack McCaigue - jack.mccaigue@astralfield.com</p>
          <p>• + 5 more league members...</p>
          <p><strong>Password for all:</strong> player123!</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`input-field ${validationErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {validationErrors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {validationErrors.email}
            </p>
          )}
        </div>

        {/* Password field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`input-field pr-10 ${validationErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {validationErrors.password && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {validationErrors.password}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/80 rounded-xl p-5 shadow-lg">
            <p className="text-base text-red-800 flex items-center font-medium">
              <AlertCircle className="h-5 w-5 mr-3 text-red-600" />
              {error}
            </p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
              Signing in...
            </>
          ) : (
            <>
              <span className="mr-2">Sign in</span>
              <span className="text-lg">🚀</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// Main login page component
export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'profile' | 'form'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Handle profile selection login
  const handleProfileLogin = async (profile: UserProfile) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Use the real user password for 2025 NFL Season Week 3 users
      const result = await login(profile.email, 'player123!');
      
      if (result.success) {
        setSuccess(`Successfully logged in as ${profile.name}`);
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual form login
  const handleFormLogin = async (email: string, password: string) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        setSuccess('Successfully logged in!');
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">🏈</span>
          </div>
        </div>
        <h1 className="mt-6 text-center text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Welcome to AstralField
        </h1>
        <p className="mt-3 text-center text-base text-gray-700 font-medium">
          NFL Week 3 • 2025 Championship League
        </p>
        <p className="mt-1 text-center text-sm text-gray-600">
          Sign in to access your fantasy football dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white/80 backdrop-blur-sm py-8 px-4 shadow-xl border border-white/20 sm:rounded-2xl sm:px-10">
          {/* Login method toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-1 flex shadow-inner">
              <button
                onClick={() => setLoginMethod('profile')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMethod === 'profile'
                    ? 'bg-white text-blue-600 shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Select Profile
              </button>
              <button
                onClick={() => setLoginMethod('form')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMethod === 'form'
                    ? 'bg-white text-blue-600 shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Manual Login
              </button>
            </div>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/80 rounded-xl p-5 shadow-lg">
              <p className="text-base text-green-800 flex items-center font-medium">
                <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                {success}
              </p>
            </div>
          )}

          {/* Login content */}
          {loginMethod === 'profile' ? (
            <ProfileSelection onSelect={handleProfileLogin} />
          ) : (
            <LoginForm 
              onSubmit={handleFormLogin}
              isLoading={isLoading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}