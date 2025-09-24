import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  BarChart3, 
  Shield, 
  Smartphone, 
  Users, 
  Trophy,
  Star,
  ArrowRight,
  Play,
  CheckCircle
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      title: "Real-Time Scoring",
      description: "Get instant updates the moment they happen. Never miss a touchdown again with live game tracking.",
      highlight: "Updates in seconds, not minutes"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-blue-500" />,
      title: "AI-Powered Analytics",
      description: "Make informed decisions with advanced insights, player projections, and matchup analysis.",
      highlight: "Data-driven recommendations"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-500" />,
      title: "Fair Trade System",
      description: "Trade with confidence using our fairness algorithm that ensures competitive balance.",
      highlight: "Anti-collusion protection"
    },
    {
      icon: <Smartphone className="h-8 w-8 text-purple-500" />,
      title: "Mobile-First Design",
      description: "Manage your team anywhere with our responsive, intuitive mobile experience.",
      highlight: "Seamless across all devices"
    },
    {
      icon: <Users className="h-8 w-8 text-orange-500" />,
      title: "League Management",
      description: "Comprehensive commissioner tools with automated dispute resolution and custom settings.",
      highlight: "Professional-grade controls"
    },
    {
      icon: <Trophy className="h-8 w-8 text-yellow-600" />,
      title: "Achievement System",
      description: "Unlock badges, track milestones, and compete on leaderboards beyond your league.",
      highlight: "Gamified experience"
    }
  ];

  const testimonials = [
    {
      name: "Mike Chen",
      role: "League Commissioner",
      avatar: "MC",
      text: "Finally, a platform that handles all the commissioner headaches automatically. The trade analyzer alone has prevented three disputes this season.",
      rating: 5
    },
    {
      name: "Sarah Rodriguez",
      role: "Fantasy Veteran",
      avatar: "SR", 
      text: "The real-time scoring is a game-changer. I can watch my team's performance live while watching the actual games. It's addictive!",
      rating: 5
    },
    {
      name: "David Kim",
      role: "Data Analyst",
      avatar: "DK",
      text: "The analytics depth is incredible. Player projections, strength of schedule, target share trends - everything I need to dominate my leagues.",
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for casual leagues",
      features: [
        "Up to 10 team leagues",
        "Basic scoring",
        "Mobile app access",
        "Standard support"
      ],
      isPopular: false
    },
    {
      name: "Pro",
      price: "$29",
      period: "per season",
      description: "For serious fantasy managers",
      features: [
        "Unlimited team leagues",
        "Advanced analytics",
        "Real-time notifications",
        "Priority support",
        "Custom scoring rules",
        "Trade analyzer"
      ],
      isPopular: true
    },
    {
      name: "League",
      price: "$99",
      period: "per league/season",
      description: "For premium leagues",
      features: [
        "All Pro features",
        "Commissioner tools",
        "Custom branding",
        "Advanced statistics",
        "API access",
        "Dedicated support"
      ],
      isPopular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-6xl mx-auto">
          <Badge variant="secondary" className="mb-6 text-lg px-6 py-2">
            🚀 Now Live - Join 10,000+ Fantasy Managers
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AstralField
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
            Fantasy Football. <span className="font-bold text-blue-600">Elevated.</span>
          </p>
          
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Where strategy meets innovation, and every decision shapes your destiny in the cosmos of fantasy sports.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
              Start Your League
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">10K+</div>
              <div className="text-gray-600">Active Managers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">500+</div>
              <div className="text-gray-600">Active Leagues</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Fantasy Managers Choose AstralField</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for the modern fantasy manager who demands more from their platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {feature.icon}
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{feature.description}</p>
                  <Badge variant="secondary" className="text-xs">
                    {feature.highlight}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by Fantasy Managers</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-lg font-semibold ml-2">4.9/5 on App Stores</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                  
                  <div className="flex mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  
                  <p className="text-gray-600 italic">"{testimonial.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-gray-600">
              Start free, upgrade when you're ready to dominate
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative border-2 ${plan.isPopular ? 'border-blue-500' : 'border-gray-200'}`}>
                {plan.isPopular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-blue-600">
                    {plan.price}
                    <span className="text-base font-normal text-gray-500">/{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${plan.isPopular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                  >
                    {plan.name === 'Free' ? 'Get Started' : 'Start Trial'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Elevate Your Fantasy Game?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of managers who've already made the switch to smarter fantasy football.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="px-8 py-4 text-lg">
              Create Your League Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button size="lg" variant="outline" className="px-8 py-4 text-lg text-white border-white hover:bg-white hover:text-blue-600">
              Download Mobile App
            </Button>
          </div>
          
          <p className="text-sm opacity-75 mt-6">
            No credit card required • Free forever plan available
          </p>
        </div>
      </section>
    </div>
  );
}