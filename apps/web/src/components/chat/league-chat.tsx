'use client'

import { useState, useEffect, useRef } from 'react'
import { useLeagueChat, useTradeNotifications } from '@/hooks/use-websocket'
import { Button } from '@/components/ui/button'
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ArrowsRightLeftIcon,
  BellIcon,
  UserIcon
} from '@heroicons/react/outline'

interface LeagueChatProps {
  leagueId: string
  currentUserId: string
  currentUserName: string
}

export function LeagueChat({ leagueId, currentUserId, currentUserName }: LeagueChatProps) {
  const { state, messages, typing, sendMessage, sendTyping } = useLeagueChat(leagueId)
  const { tradeProposals, notifications, proposeTrade } = useTradeNotifications()
  
  const [messageText, setMessageText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showTradeDialog, setShowTradeDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'notifications'>('chat')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageText.trim()) {
      sendMessage(messageText)
      setMessageText('')
      handleStopTyping()
    }
  }

  const handleTyping = (text: string) => {
    setMessageText(text)
    
    if (!isTyping && text.length > 0) {
      setIsTyping(true)
      sendTyping(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping()
    }, 2000)
  }

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false)
      sendTyping(false)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }

  const formatMessageTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const isMyMessage = (userId: string) => userId === currentUserId

  if (!state.connected) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="text-center">
          <div className="loading-spinner h-6 w-6 mx-auto mb-2"></div>
          <p className="text-gray-400">Connecting to chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 h-96 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3 py-1 rounded text-sm font-medium ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              <span>Chat</span>
              {messages.length > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                  {messages.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center space-x-2 px-3 py-1 rounded text-sm font-medium ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BellIcon className="h-4 w-4" />
              <span>Notifications</span>
              {notifications.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTradeDialog(true)}
        >
          <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
          Propose Trade
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'chat' ? (
          <>
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((message: any) => (
                <div
                  key={message.id}
                  className={`flex ${
                    isMyMessage(message.userId) ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      isMyMessage(message.userId)
                        ? 'bg-blue-600 text-white'
                        : message.type === 'TRADE'
                        ? 'bg-orange-600 text-white'
                        : message.type === 'ANNOUNCEMENT'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {!isMyMessage(message.userId) && (
                      <div className="text-xs text-gray-300 mb-1">
                        {message.userName}
                      </div>
                    )}
                    
                    <div className="text-sm">
                      {message.type === 'TRADE' && (
                        <div className="flex items-center space-x-1 mb-2">
                          <ArrowsRightLeftIcon className="h-4 w-4" />
                          <span className="font-medium">Trade Proposal</span>
                        </div>
                      )}
                      {message.message}
                    </div>
                    
                    <div className="text-xs text-gray-300 mt-1 text-right">
                      {formatMessageTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicators */}
              {typing.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {typing.length === 1 ? '1 person' : `${typing.length} people`} typing...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-700">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => handleTyping(e.target.value)}
                  onBlur={handleStopTyping}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="submit"
                  disabled={!messageText.trim()}
                  size="sm"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          /* Notifications Tab */
          <div className="flex-1 p-4 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <BellIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.type === 'trade_proposal'
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          notification.type === 'trade_proposal'
                            ? 'bg-orange-500/20'
                            : 'bg-blue-500/20'
                        }`}>
                          {notification.type === 'trade_proposal' ? (
                            <ArrowsRightLeftIcon className="h-5 w-5 text-orange-400" />
                          ) : (
                            <BellIcon className="h-5 w-5 text-blue-400" />
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-white">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatMessageTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>

                      {notification.type === 'trade_proposal' && (
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trade Proposal Dialog */}
      {showTradeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Propose Trade</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trade with
                </label>
                <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white">
                  <option>Select team...</option>
                  <option>Fire Breathing Rubber Ducks</option>
                  <option>Victorious Secret</option>
                  <option>The Replacements</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
                  placeholder="Add a message to your trade proposal..."
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTradeDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button className="flex-1">
                  Create Trade
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}