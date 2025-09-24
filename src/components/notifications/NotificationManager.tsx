import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import {
  BellIcon,
  BellAlertIcon,
  CheckIcon,
  XMarkIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  createdAt: string;
  delivery: Array<{
    status: string;
    deliveredAt?: string;
    readAt?: string;
  }>;
}

interface NotificationManagerProps {
  className?: string;
}

export default function NotificationManager({ className = '' }: NotificationManagerProps) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (session?.user) {
      checkPushSupport();
      fetchNotifications();
    }
  }, [session]);

  const checkPushSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      checkSubscription();
    }
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      });

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription })
      });

      if (response.ok) {
        setIsSubscribed(true);
        toast.success('Push notifications enabled!');
      } else {
        throw new Error('Failed to subscribe');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST'
      });

      if (response.ok) {
        setIsSubscribed(false);
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Failed to disable push notifications');
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/history?limit=20');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? {
                  ...notif,
                  delivery: notif.delivery.map(d => ({ ...d, readAt: new Date().toISOString() }))
                }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Handle notification action based on type
    if (notification.data?.action) {
      const action = notification.data.action;
      const leagueId = notification.data.leagueId;
      
      switch (action) {
        case 'view_trade':
          window.location.href = `/leagues/${leagueId}/trades`;
          break;
        case 'make_pick':
          window.location.href = `/leagues/${leagueId}/draft`;
          break;
        case 'view_waivers':
          window.location.href = `/leagues/${leagueId}/waivers`;
          break;
        case 'set_lineup':
          window.location.href = `/leagues/${leagueId}/team`;
          break;
        case 'view_matchup':
          window.location.href = `/leagues/${leagueId}/matchup`;
          break;
        case 'view_league':
          window.location.href = `/leagues/${leagueId}`;
          break;
        default:
          break;
      }
    }
    
    setIsOpen(false);
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const unreadCount = notifications.filter(n => 
    !n.delivery[0]?.readAt
  ).length;

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      trade_proposed: '🔄',
      trade_accepted: '✅',
      trade_rejected: '❌',
      trade_countered: '↩️',
      draft_pick_made: '📋',
      draft_your_turn: '⏰',
      waiver_processed: '📋',
      waiver_claimed: '🎯',
      score_update: '🏈',
      matchup_close: '🔥',
      commissioner_action: '⚖️',
      league_update: '📢',
      lineup_reminder: '⚠️',
      player_news: '📰'
    };
    
    return iconMap[type as keyof typeof iconMap] || '🔔';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Push Notification Settings */}
          {showSettings && (
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Push Notifications</span>
                {pushSupported ? (
                  <button
                    onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
                    className={`px-3 py-1 text-xs rounded-full ${
                      isSubscribed 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {isSubscribed ? 'Enabled' : 'Enable'}
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">Not supported</span>
                )}
              </div>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const isRead = !!notification.delivery[0]?.readAt;
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              !isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            {!isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full ml-2"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50">
              <button
                onClick={fetchNotifications}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}