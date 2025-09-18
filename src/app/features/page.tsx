'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, Star, Zap, Trophy, Users, TrendingUp, Shield, Bell, 
  Brain, Mic, Box, Coins, Cloud, Activity, BarChart3, MessageSquare,
  Target, Gamepad2, Eye, Smartphone, Palette, Globe
} from 'lucide-react';

const features = [
  {
    category: 'AI-Powered Intelligence',
    icon: Brain,
    items: [
      {
        name: 'AI Lineup Optimizer',
        description: 'Machine learning algorithms optimize your starting lineup for maximum points based on projections, matchups, and historical data',
        status: 'Active',
        premium: true,
        path: '/lineup/optimizer'
      },
      {
        name: 'Injury Prediction System',
        description: 'Advanced AI models predict player injury risks using historical data, workload analysis, and medical patterns',
        status: 'Active',
        premium: true,
        path: '/analytics/injuries'
      },
      {
        name: 'Weather Impact Analysis',
        description: 'Real-time weather data integrated with player performance analytics to optimize lineup decisions',
        status: 'Active',
        premium: true,
        path: '/analytics/weather'
      },
      {
        name: 'Trade Intelligence Engine',
        description: 'AI-powered trade analyzer evaluating fairness, team needs, and dynasty value with market predictions',
        status: 'Active',
        premium: true,
        path: '/trade/analyzer'
      }
    ]
  },
  {
    category: 'Immersive Experience',
    icon: Box,
    items: [
      {
        name: 'Voice-Controlled Management',
        description: 'Hands-free lineup management, player searches, and league commands using advanced speech recognition',
        status: 'Active',
        premium: true,
        path: '/voice'
      },
      {
        name: 'AR Player Cards',
        description: '3D augmented reality player cards with real-time stats, projections, and interactive visualizations',
        status: 'Active',
        premium: true,
        path: '/ar/players'
      },
      {
        name: '3D Stadium Visualization',
        description: 'Immersive 3D stadium environments with live game tracking and player positioning',
        status: 'Active',
        premium: true,
        path: '/visualization/stadiums'
      },
      {
        name: 'VR Draft Experience',
        description: 'Virtual reality draft rooms with spatial audio and immersive player selection interfaces',
        status: 'Beta',
        premium: true,
        path: '/draft/vr'
      }
    ]
  },
  {
    category: 'Blockchain & Rewards',
    icon: Coins,
    items: [
      {
        name: 'NFT Achievement System',
        description: 'Earn unique NFT trophies and badges for fantasy achievements, tradeable on secondary markets',
        status: 'Active',
        premium: true,
        path: '/blockchain/achievements'
      },
      {
        name: 'Cryptocurrency Rewards',
        description: 'Custom AstralField tokens earned through performance, trades, and league participation',
        status: 'Active',
        premium: true,
        path: '/blockchain/rewards'
      },
      {
        name: 'Smart Contract Payouts',
        description: 'Automated prize distribution using blockchain smart contracts for transparent, instant payouts',
        status: 'Beta',
        premium: true,
        path: '/blockchain/contracts'
      },
      {
        name: 'Decentralized Governance',
        description: 'Token-based voting system for league rule changes and feature development decisions',
        status: 'Coming Soon',
        premium: true,
        path: '/governance'
      }
    ]
  },
  {
    category: 'Advanced Analytics',
    icon: BarChart3,
    items: [
      {
        name: 'Performance Monitoring',
        description: 'Real-time application performance tracking with Core Web Vitals and optimization suggestions',
        status: 'Active',
        premium: false,
        path: '/analytics/performance'
      },
      {
        name: 'Predictive Modeling',
        description: 'Machine learning models for season-long projections, playoff odds, and championship probabilities',
        status: 'Active',
        premium: true,
        path: '/analytics/predictions'
      },
      {
        name: 'Social Sentiment Analysis',
        description: 'Track player buzz and sentiment across social media to identify breakout candidates',
        status: 'Active',
        premium: true,
        path: '/analytics/sentiment'
      },
      {
        name: 'Dynasty Asset Valuation',
        description: 'Comprehensive dynasty player valuations with age curves, opportunity analysis, and future projections',
        status: 'Active',
        premium: true,
        path: '/dynasty/valuations'
      }
    ]
  },
  {
    category: 'Real-Time Features',
    icon: Activity,
    items: [
      {
        name: 'Live Scoring Engine',
        description: 'Sub-second live scoring updates with WebSocket connections and instant push notifications',
        status: 'Active',
        premium: false,
        path: '/scoring/live'
      },
      {
        name: 'Social Hub & Chat',
        description: 'Real-time league chat with emoji reactions, GIF support, and trash talk analytics',
        status: 'Active',
        premium: false,
        path: '/chat'
      },
      {
        name: 'Live Draft Assistant',
        description: 'Real-time draft recommendations with value-based drafting and need-based suggestions',
        status: 'Active',
        premium: true,
        path: '/draft/assistant'
      },
      {
        name: 'Breaking News Alerts',
        description: 'Instant notifications for injuries, trades, and roster moves that affect your players',
        status: 'Active',
        premium: false,
        path: '/news/alerts'
      }
    ]
  },
  {
    category: 'Platform Excellence',
    icon: Zap,
    items: [
      {
        name: 'Progressive Web App',
        description: 'Full mobile app experience with offline capabilities and push notifications',
        status: 'Active',
        premium: false,
        path: '/pwa'
      },
      {
        name: 'Multi-Platform Sync',
        description: 'Seamless synchronization across web, mobile, and desktop applications',
        status: 'Active',
        premium: false,
        path: '/sync'
      },
      {
        name: 'Enterprise Security',
        description: 'Bank-level encryption, two-factor authentication, and SOC 2 compliance',
        status: 'Active',
        premium: false,
        path: '/security'
      },
      {
        name: 'API Ecosystem',
        description: 'Comprehensive REST and GraphQL APIs for third-party integrations and custom tools',
        status: 'Active',
        premium: true,
        path: '/api/docs'
      }
    ]
  }
];

function getStatusColor(status: string) {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Beta':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Coming Soon':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function FeaturesPage() {
  const handleFeatureClick = (path: string) => {
    if (path) {
      window.location.href = path;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Star className="h-8 w-8 text-yellow-500 mr-2" />
            <h1 className="text-4xl font-bold text-slate-900">AstralField Pro Features</h1>
          </div>
          <p className="text-xl text-slate-600 max-w-4xl mx-auto">
            Experience the most advanced fantasy football platform ever built. From AI-powered lineup optimization 
            to blockchain rewards, AstralField delivers cutting-edge features that give you the competitive edge.
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-3 py-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              25+ Premium Features
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 px-3 py-1">
              <Brain className="h-4 w-4 mr-1" />
              AI-Powered
            </Badge>
            <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 px-3 py-1">
              <Activity className="h-4 w-4 mr-1" />
              Real-Time
            </Badge>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-16">
          {features.map((category) => {
            const IconComponent = category.icon;
            return (
              <div key={category.category} className="">
                <div className="flex items-center mb-8">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 mr-4">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">{category.category}</h2>
                    <p className="text-slate-600 mt-1">Revolutionary tools for the modern fantasy manager</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                  {category.items.map((feature) => (
                    <div
                      key={feature.name}
                      onClick={() => handleFeatureClick(feature.path)}
                      className="cursor-pointer"
                    >
                      <Card 
                        className="relative overflow-hidden border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 group"
                      >
                      {feature.premium && (
                        <div className="absolute top-4 right-4 z-10">
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg">
                            <Star className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <CardHeader className="pb-4 relative z-10">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-xl font-bold text-slate-900 pr-8 group-hover:text-blue-700 transition-colors">
                            {feature.name}
                          </CardTitle>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`w-fit ${getStatusColor(feature.status)} shadow-sm`}
                        >
                          {feature.status === 'Active' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {feature.status === 'Beta' && <Zap className="h-3 w-3 mr-1" />}
                          {feature.status === 'Coming Soon' && <Star className="h-3 w-3 mr-1" />}
                          {feature.status}
                        </Badge>
                      </CardHeader>
                      
                      <CardContent className="relative z-10">
                        <CardDescription className="text-slate-600 leading-relaxed text-base mb-4">
                          {feature.description}
                        </CardDescription>
                        {feature.status === 'Active' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200"
                          >
                            Try Now
                            <Zap className="h-3 w-3 ml-2" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Banner */}
        <div className="mt-20 mb-16">
          <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-0 text-white">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-400 mb-2">25+</div>
                  <div className="text-slate-300">Premium Features</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-400 mb-2">99.9%</div>
                  <div className="text-slate-300">Uptime SLA</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">&lt;100ms</div>
                  <div className="text-slate-300">API Response Time</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-400 mb-2">∞</div>
                  <div className="text-slate-300">Competitive Advantage</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
            <CardContent className="p-10">
              <Trophy className="h-16 w-16 mx-auto mb-6 text-yellow-400" />
              <h3 className="text-3xl font-bold mb-4">The Future of Fantasy Football</h3>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
                AstralField isn't just a fantasy platform—it's your secret weapon. With cutting-edge AI, 
                immersive experiences, and blockchain rewards, you're not just playing fantasy football, 
                you're dominating it.
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-blue-600 hover:bg-slate-100 font-semibold px-8"
                  onClick={() => window.location.href = '/'}
                >
                  Explore Dashboard
                  <Star className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10 font-semibold px-8"
                  onClick={() => window.location.href = '/api/docs'}
                >
                  View API Docs
                  <Globe className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}