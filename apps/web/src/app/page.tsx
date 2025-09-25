import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon, ChartBarIcon, BoltIcon } from '@heroicons/react/24/outline'

export default async function HomePage() {
  // Remove auth check for now to fix NextAuth issues
  // Middleware will handle authentication redirects

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  AstralField
                </h1>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <span className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium cursor-pointer">
                    Features
                  </span>
                  <span className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium cursor-pointer">
                    Pricing
                  </span>
                  <span className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium cursor-pointer">
                    About
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              The AI-Powered{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Fantasy Platform
              </span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-300">
              That serious leagues deserve. Advanced AI coaching, real-time updates, 
              and enterprise-grade performance in one powerful platform.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="text-lg px-8 py-4">
                  Start Your League
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                  Try Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-purple-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Next-Generation Fantasy Features
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              Built for commissioners and players who demand excellence
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* AI Coach */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-700/50 to-slate-800/50 p-8 backdrop-blur-sm border border-slate-700 hover:border-slate-600 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <SparklesIcon className="h-10 w-10 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">AI Coach</h3>
                <p className="text-gray-300 mb-6">
                  Advanced AI algorithms provide lineup optimization, trade analysis, 
                  waiver recommendations, and start/sit advice.
                </p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Lineup Optimizer</li>
                  <li>• Trade Analyzer</li>
                  <li>• Waiver Scout</li>
                  <li>• Start/Sit Advisor</li>
                </ul>
              </div>
            </div>

            {/* Real-time Updates */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-700/50 to-slate-800/50 p-8 backdrop-blur-sm border border-slate-700 hover:border-slate-600 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <BoltIcon className="h-10 w-10 text-green-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Real-time Everything</h3>
                <p className="text-gray-300 mb-6">
                  Sub-50ms WebSocket updates for draft rooms, live scoring, 
                  and instant notifications. Never miss a moment.
                </p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Live Draft Rooms</li>
                  <li>• Real-time Scoring</li>
                  <li>• Instant Notifications</li>
                  <li>• Activity Feed</li>
                </ul>
              </div>
            </div>

            {/* Analytics */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-700/50 to-slate-800/50 p-8 backdrop-blur-sm border border-slate-700 hover:border-slate-600 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <ChartBarIcon className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Advanced Analytics</h3>
                <p className="text-gray-300 mb-6">
                  Deep statistical analysis, performance insights, and predictive 
                  modeling to give you the competitive edge.
                </p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Performance Insights</li>
                  <li>• Matchup Predictor</li>
                  <li>• Trade Fairness</li>
                  <li>• Injury Predictor</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to revolutionize your league?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Join thousands of fantasy players who have already made the switch.
          </p>
          <div className="mt-10">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8 py-4">
                Create Your League Now
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AstralField v3.0
            </h3>
            <p className="mt-2 text-gray-400">
              The AI-Powered Fantasy Platform That Serious Leagues Deserve
            </p>
            <div className="mt-8 flex justify-center space-x-6 text-gray-400">
              <span className="hover:text-white cursor-pointer">Privacy</span>
              <span className="hover:text-white cursor-pointer">Terms</span>
              <span className="hover:text-white cursor-pointer">Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}