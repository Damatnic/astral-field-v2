'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

// D'Amato Dynasty League user profiles
const userProfiles: UserProfile[] = [
  // Admin
  {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@astralfield.com',
    role: 'admin',
    avatar: '/api/avatars/admin',
    description: 'System Administrator - Full access'
  },
  // Commissioner
  {
    id: 'comm-001',
    name: 'Commissioner',
    email: 'commissioner@astralfield.com',
    role: 'commissioner',
    avatar: '/api/avatars/commissioner',
    description: 'League Commissioner - D\'Amato Dynasty League'
  },
  // Players
  {
    id: 'player-001',
    name: 'Player One',
    email: 'player1@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/player1',
    description: 'Dynasty League Player - Strategic trader'
  },
  {
    id: 'demo-001',
    name: 'Demo User',
    email: 'demo@astralfield.com',
    role: 'player',
    avatar: '/api/avatars/demo',
    description: 'Demo account for testing - Full features available'
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Profile</h2>
        <p className="text-gray-600">
          Select a demo user profile to explore different roles and permissions.
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
            className="group text-left p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {profile.avatar ? (
                  <img
                    className="h-12 w-12 rounded-full object-cover"
                    src={profile.avatar}
                    alt={profile.name}
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
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
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
          Enter credentials manually or use the demo passwords provided.
        </p>
      </div>

      {/* Demo credentials info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Available Users:</strong></p>
          <p>• admin@astralfield.com</p>
          <p>• commissioner@astralfield.com</p>
          <p>• player1@astralfield.com</p>
          <p>• demo@astralfield.com</p>
          <p><strong>Password for all:</strong> demo123</p>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Signing in...
            </>
          ) : (
            'Sign in'
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
      // Use the demo password for all users in production/simple auth
      const result = await login(profile.email, 'demo123');
      
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">AF</span>
          </div>
        </div>
        <h1 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Welcome to AstralField
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your fantasy football dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Login method toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setLoginMethod('profile')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  loginMethod === 'profile'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Quick Demo
              </button>
              <button
                onClick={() => setLoginMethod('form')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  loginMethod === 'form'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Manual Login
              </button>
            </div>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
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