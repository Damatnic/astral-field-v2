'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy,
  Users,
  TrendingUp,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Redirect authenticated users
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-field-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:w-full lg:pb-28 xl:pb-32">
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="sm:text-center lg:text-left pt-8 sm:pt-12 lg:pt-16">
                <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
                  <div>
                    <div className="flex justify-center lg:justify-start">
                      <div className="w-20 h-20 bg-field-green-500 rounded-2xl flex items-center justify-center mb-8">
                        <Trophy className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <h1 className="text-4xl tracking-tight font-bold text-gray-900 sm:text-5xl md:text-6xl">
                      <span className="block">Fantasy Football</span>
                      <span className="block text-field-green-600">League</span>
                    </h1>
                    <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                      Manage your fantasy football team with our professional platform. Track players, analyze stats, and compete for the championship.
                    </p>
                    <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                      <div className="rounded-md shadow">
                        <button
                          onClick={() => router.push('/login')}
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-field-green-600 hover:bg-field-green-700 md:py-4 md:text-lg md:px-10"
                        >
                          Get Started
                          <ChevronRight className="ml-2 w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-12 lg:mt-0">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="card">
                        <div className="card-body text-center">
                          <Users className="w-8 h-8 text-field-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-gray-900">8</div>
                          <div className="text-sm text-gray-600">Teams</div>
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-body text-center">
                          <TrendingUp className="w-8 h-8 text-field-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-gray-900">2025</div>
                          <div className="text-sm text-gray-600">Season</div>
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-body text-center">
                          <BarChart3 className="w-8 h-8 text-field-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-gray-900">Live</div>
                          <div className="text-sm text-gray-600">Stats</div>
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-body text-center">
                          <Trophy className="w-8 h-8 text-field-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-gray-900">$500</div>
                          <div className="text-sm text-gray-600">Prize</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to win
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Professional tools for serious fantasy football managers
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="card">
                <div className="card-body">
                  <div className="w-12 h-12 bg-field-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-field-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Team Management</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Manage your roster, set lineups, and track player performance all in one place.
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="w-12 h-12 bg-field-green-100 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-field-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Live Scoring</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Real-time scoring updates and detailed player statistics throughout the season.
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="w-12 h-12 bg-field-green-100 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-field-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Advanced analytics and insights to help you make better decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-field-green-600">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            <span className="block">Ready to dominate?</span>
            <span className="block">Join the league today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-field-green-100">
            Sign in to access your team dashboard and start managing your fantasy football dynasty.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-field-green-600 bg-white hover:bg-gray-50 sm:w-auto"
          >
            Sign In Now
            <ChevronRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}