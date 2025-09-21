'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Link as LinkIcon, Unlink, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSleeperAuth } from '@/lib/sleeper/hooks';

interface SleeperAuthCardProps {
  className?: string;
}

export function SleeperAuthCard({ className }: SleeperAuthCardProps) {
  const { connected, user, loading, error, connect, disconnect } = useSleeperAuth();

  const handleConnect = async () => {
    await connect('/dashboard?tab=sleeper');
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your Sleeper account?')) {
      await disconnect();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded" />
              Sleeper Integration
            </CardTitle>
            <CardDescription>
              Connect your Sleeper account to sync leagues and data
            </CardDescription>
          </div>
          <Badge variant={connected ? 'default' : 'secondary'}>
            {connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {connected && user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : undefined}
                  alt={user.display_name}
                />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.display_name}</p>
                <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <LinkIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Sleeper account to access your leagues, players, and real-time updates.
              </p>
            </div>
            
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-2" />
              )}
              Connect Sleeper Account
            </Button>
            
            <div className="text-xs text-muted-foreground text-center">
              <p>Secure OAuth2 connection • No passwords stored</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}