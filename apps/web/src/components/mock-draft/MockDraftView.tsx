'use client'

import { GradientCard } from '@/components/redesign'
import { Gamepad2, Users, Clock, TrendingUp } from 'lucide-react'

export function MockDraftView() {
  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Smart AI Opponents',
      description: 'Practice against realistic AI drafters with varying strategies',
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Real Draft Timer',
      description: 'Experience authentic draft pressure with actual time limits',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Full Features',
      description: 'Access all draft tools including rankings, tiers, and recommendations',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Mock Draft</h1>
          <p className="text-gray-400">Practice makes perfect - simulate your draft strategy</p>
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <GradientCard gradient="purple-blue" className="p-8 sm:p-12 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-fantasy-purple-600 to-fantasy-blue-600 flex items-center justify-center">
                <Gamepad2 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Practice Makes Perfect
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Sharpen your draft skills before the real thing. Our mock draft simulator puts you against intelligent AI opponents in a realistic draft environment.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-slate-800 flex items-center justify-center text-fantasy-purple-400">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button className="px-8 py-4 bg-gradient-to-r from-fantasy-purple-600 to-fantasy-blue-600 hover:from-fantasy-purple-700 hover:to-fantasy-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-fantasy-purple-500/30 transition-all duration-200 transform hover:scale-105">
              Start Mock Draft Now
            </button>

            <p className="text-sm text-gray-500 mt-4">
              No account required • Takes 30-45 minutes
            </p>
          </GradientCard>

          {/* Draft Settings */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GradientCard gradient="dark" className="p-6">
              <h3 className="font-semibold text-white mb-4">Quick Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">League Size</label>
                  <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fantasy-purple-500">
                    <option>10 Teams</option>
                    <option>12 Teams</option>
                    <option>14 Teams</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Draft Type</label>
                  <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fantasy-purple-500">
                    <option>Snake Draft</option>
                    <option>Linear Draft</option>
                  </select>
                </div>
              </div>
            </GradientCard>

            <GradientCard gradient="dark" className="p-6">
              <h3 className="font-semibold text-white mb-4">Scoring Format</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Format</label>
                  <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fantasy-purple-500">
                    <option>PPR (Point Per Reception)</option>
                    <option>Half PPR</option>
                    <option>Standard</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Draft Position</label>
                  <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fantasy-purple-500">
                    <option>Random</option>
                    <option>1st Overall</option>
                    <option>Mid-Round (5-6)</option>
                    <option>Late Round (10-12)</option>
                  </select>
                </div>
              </div>
            </GradientCard>
          </div>

          {/* Tips */}
          <GradientCard gradient="dark" className="p-6 mt-6">
            <h3 className="font-semibold text-white mb-4">Mock Draft Tips</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-fantasy-purple-400">•</span>
                <span>Take mock drafts seriously to build muscle memory for draft day</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fantasy-blue-400">•</span>
                <span>Practice different strategies: Zero RB, Hero RB, Balanced, etc.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fantasy-green-400">•</span>
                <span>Pay attention to run patterns and positional scarcity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fantasy-yellow-400">•</span>
                <span>Use the mock draft to test out sleeper picks and late-round values</span>
              </li>
            </ul>
          </GradientCard>
        </div>
      </div>
    </div>
  )
}

