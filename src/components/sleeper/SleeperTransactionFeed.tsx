'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowUpDown, 
  TrendingUp, 
  Users, 
  Clock, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Trophy,
  Activity
} from 'lucide-react';
import { useSleeperTransactions, useSleeperTransactionUpdates } from '@/lib/sleeper/hooks';
import { SleeperTransaction } from '@/lib/sleeper/types';
import { cn } from '@/lib/utils';

interface SleeperTransactionFeedProps {
  leagueId: string;
  className?: string;
}

export function SleeperTransactionFeed({ leagueId, className }: SleeperTransactionFeedProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  
  const {
    transactions,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    syncTransactions,
    startMonitoring,
    stopMonitoring,
    refresh
  } = useSleeperTransactions(leagueId, {
    type: selectedType || undefined,
    limit: 50
  });

  const { transactions: liveTransactions, tradeOffers } = useSleeperTransactionUpdates(leagueId);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'trade':
        return <ArrowUpDown className="h-4 w-4" />;
      case 'waiver':
        return <Clock className="h-4 w-4" />;
      case 'free_agent':
        return <Users className="h-4 w-4" />;
      case 'commissioner':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTransactionDescription = (transaction: SleeperTransaction) => {
    const { type, adds, drops, rosterIds } = transaction;

    if (type === 'trade') {
      const addCount = adds ? Object.keys(adds).length : 0;
      const dropCount = drops ? Object.keys(drops).length : 0;
      const teamCount = rosterIds.length;
      return `${teamCount}-team trade involving ${addCount + dropCount} players`;
    }

    if (type === 'waiver') {
      const addCount = adds ? Object.keys(adds).length : 0;
      const dropCount = drops ? Object.keys(drops).length : 0;
      const bidAmount = transaction.freeAgentBudget;
      return `Waiver claim: ${addCount} added, ${dropCount} dropped${bidAmount ? ` ($${bidAmount})` : ''}`;
    }

    if (type === 'free_agent') {
      const addCount = adds ? Object.keys(adds).length : 0;
      const dropCount = drops ? Object.keys(drops).length : 0;
      return `Free agent pickup: ${addCount} added, ${dropCount} dropped`;
    }

    if (type === 'commissioner') {
      return 'Commissioner action';
    }

    return 'Transaction';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const transactionTypes = [
    { value: '', label: 'All Types' },
    { value: 'trade', label: 'Trades' },
    { value: 'waiver', label: 'Waivers' },
    { value: 'free_agent', label: 'Free Agents' },
    { value: 'commissioner', label: 'Commissioner' }
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Transaction Feed
              </CardTitle>
              <CardDescription>
                Real-time league transactions and activity
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Transaction Feed */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="recent" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="live">Live Updates</TabsTrigger>
            </TabsList>

            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Transactions</CardTitle>
                  {total > 0 && (
                    <CardDescription>{total} total transactions</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {error ? (
                    <div className="text-center py-8">
                      <p className="text-destructive mb-4">{error}</p>
                      <Button onClick={refresh}>Try Again</Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-shrink-0 mt-1">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {transaction.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(transaction.status)}
                                  <Badge variant={getStatusColor(transaction.status)} className="text-xs">
                                    {transaction.status}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm font-medium mb-1">
                                {formatTransactionDescription(transaction)}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Teams: {transaction.rosterIds.join(', ')}</span>
                                <Separator orientation="vertical" className="h-3" />
                                <span>{formatDate(transaction.created)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {transactions.length === 0 && !loading && (
                          <div className="text-center py-8">
                            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No transactions found</p>
                          </div>
                        )}
                      </div>
                      {hasMore && (
                        <div className="text-center pt-4">
                          <Button
                            variant="outline"
                            onClick={loadMore}
                            disabled={loading}
                          >
                            {loading ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Load More
                          </Button>
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {transactions
                        .filter(t => t.status === 'pending')
                        .map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20"
                          >
                            <div className="flex-shrink-0 mt-1">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {transaction.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  PENDING
                                </Badge>
                              </div>
                              <p className="text-sm font-medium mb-1">
                                {formatTransactionDescription(transaction)}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Teams: {transaction.rosterIds.join(', ')}</span>
                                <Separator orientation="vertical" className="h-3" />
                                <span>{formatDate(transaction.created)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      {transactions.filter(t => t.status === 'pending').length === 0 && (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No pending transactions</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="live">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Updates</CardTitle>
                  <CardDescription>
                    Real-time transaction updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {liveTransactions.map((transaction, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-900/20"
                        >
                          <div className="flex-shrink-0 mt-1">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="default" className="text-xs">
                                LIVE
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {transaction.type?.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium mb-1">
                              New {transaction.type} transaction
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Just now</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {liveTransactions.length === 0 && (
                        <div className="text-center py-8">
                          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No live updates yet</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Enable live monitoring to see real-time updates
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trade Offers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Trade Offers
                {tradeOffers.length > 0 && (
                  <Badge variant="destructive">{tradeOffers.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {tradeOffers.map((offer, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Trade Offer</span>
                        <Badge variant="outline" className="text-xs">
                          NEW
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Multi-team trade proposal
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(offer.timestamp)}
                      </p>
                    </div>
                  ))}
                  {tradeOffers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No pending trade offers
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Transaction Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">{total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="font-bold text-lg">
                    {transactions.filter(t => t.status === 'pending').length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trades</p>
                  <p className="font-bold text-lg">
                    {transactions.filter(t => t.type === 'trade').length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Waivers</p>
                  <p className="font-bold text-lg">
                    {transactions.filter(t => t.type === 'waiver').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncTransactions()}
                disabled={loading}
                className="w-full"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Sync Transactions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startMonitoring}
                className="w-full"
              >
                <Activity className="h-4 w-4 mr-2" />
                Start Monitoring
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stopMonitoring}
                className="w-full"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Stop Monitoring
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}