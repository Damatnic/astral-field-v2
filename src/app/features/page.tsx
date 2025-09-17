'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Zap, Trophy, Users, TrendingUp, Shield, Bell } from 'lucide-react';

const features = [
  {
    category: 'League Management',
    icon: Users,
    items: [
      {
        name: 'D\'Amato Dynasty League',
        description: 'Exclusive 10-team dynasty league with Nicholas D\'Amato as commissioner',
        status: 'Active',
        premium: true
      },
      {
        name: 'Real-time Scoring',
        description: 'Live scoring updates during NFL games with instant notifications',
        status: 'Active',
        premium: false
      },
      {
        name: 'Advanced Roster Management', 
        description: 'Flexible lineup setting with dynasty roster tracking',
        status: 'Active',
        premium: false
      }
    ]
  },
  {
    category: 'Player Intelligence',
    icon: TrendingUp,
    items: [
      {
        name: 'Sleeper API Integration',
        description: 'Real-time NFL player data and injury updates',
        status: 'Active',
        premium: false
      },
      {
        name: 'Fantasy Projections',
        description: 'AI-powered weekly projections and season outlooks',
        status: 'Coming Soon',
        premium: true
      },
      {
        name: 'Trade Analyzer',
        description: 'Advanced trade evaluation with dynasty value calculations',
        status: 'Beta',
        premium: true
      }
    ]
  },
  {
    category: 'Analytics & Insights',
    icon: Trophy,
    items: [
      {
        name: 'Performance Dashboard',
        description: 'Detailed team and player performance analytics',
        status: 'Active',
        premium: false
      },
      {
        name: 'Dynasty Value Tracker',
        description: 'Long-term player value tracking for dynasty leagues',
        status: 'Beta',
        premium: true
      },
      {
        name: 'Waiver Wire Intelligence',
        description: 'AI-powered waiver recommendations and trending players',
        status: 'Coming Soon',
        premium: true
      }
    ]
  },
  {
    category: 'User Experience',
    icon: Zap,
    items: [
      {
        name: 'Mobile Responsive Design',
        description: 'Seamless experience across all devices',
        status: 'Active',
        premium: false
      },
      {
        name: 'Real-time Notifications',
        description: 'Instant alerts for scores, trades, and league activity',
        status: 'Active',
        premium: false
      },
      {
        name: 'Dark Mode Support',
        description: 'Eye-friendly dark theme for late-night fantasy sessions',
        status: 'Coming Soon',
        premium: false
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Star className="h-8 w-8 text-yellow-500 mr-2" />
            <h1 className="text-4xl font-bold text-slate-900">AstralField Features</h1>
          </div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Discover the powerful features that make AstralField the ultimate fantasy football platform 
            for the D'Amato Dynasty League and beyond.
          </p>
        </div>

        {/* Features Grid */}
        <div className="space-y-12">
          {features.map((category) => {
            const IconComponent = category.icon;
            return (
              <div key={category.category} className="">
                <div className="flex items-center mb-6">
                  <IconComponent className="h-6 w-6 text-blue-600 mr-3" />
                  <h2 className="text-2xl font-semibold text-slate-900">{category.category}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.items.map((feature) => (
                    <Card key={feature.name} className="relative overflow-hidden border-slate-200 hover:shadow-lg transition-shadow duration-200">
                      {feature.premium && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                            <Star className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg font-semibold text-slate-900 pr-2">
                            {feature.name}
                          </CardTitle>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`w-fit ${getStatusColor(feature.status)}`}
                        >
                          {feature.status === 'Active' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {feature.status}
                        </Badge>
                      </CardHeader>
                      
                      <CardContent>
                        <CardDescription className="text-slate-600 leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
            <CardContent className="p-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-white" />
              <h3 className="text-2xl font-bold mb-4">Built for Champions</h3>
              <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                AstralField combines cutting-edge technology with deep fantasy football expertise 
                to give the D'Amato Dynasty League the competitive edge they deserve.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}