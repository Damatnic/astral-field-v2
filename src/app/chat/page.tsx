'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Bell, Zap } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-4xl font-bold text-slate-900">League Chat</h1>
          </div>
          <p className="text-xl text-slate-600">
            Real-time communication for the D&apos;Amato Dynasty League
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-4">League Chat Coming Soon</h2>
            <p className="text-lg text-slate-700 mb-6">
              We&apos;re developing a real-time chat system for league members to discuss
              trades, trash talk, and share fantasy insights.
            </p>
            <Badge className="bg-blue-600 text-white">
              <Zap className="h-4 w-4 mr-2" />
              In Development
            </Badge>
          </CardContent>
        </Card>

        {/* Feature Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                League Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Dedicated channels for general chat, trade discussions, and commissioner announcements.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2 text-yellow-600" />
                Real-time Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Instant notifications for new messages, trade proposals, and league updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-purple-600" />
                Direct Messaging
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Private conversations between league members for sensitive trade negotiations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}