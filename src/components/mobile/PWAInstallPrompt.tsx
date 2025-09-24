'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  Smartphone,
  Zap,
  Bell,
  Wifi,
  Star,
  Share,
  Plus,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [installStep, setInstallStep] = useState<'prompt' | 'installing' | 'success'>('prompt');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // PWA features to highlight
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant loading and smooth animations'
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Get notified about trades, waivers, and scores'
    },
    {
      icon: Wifi,
      title: 'Works Offline',
      description: 'Access your team even without internet'
    },
    {
      icon: Star,
      title: 'Full Screen',
      description: 'Native app experience on your device'
    }
  ];

  // iOS specific installation steps
  const iosSteps = [
    { icon: Share, text: 'Tap the Share button' },
    { icon: Plus, text: 'Select "Add to Home Screen"' },
    { icon: Check, text: 'Tap "Add" to install' }
  ];

  useEffect(() => {
    // Check if we're on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Don't show prompt if already installed
    if (standalone) {
      return;
    }

    // Check if installation was previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
    
    if (dismissed && dismissedTime) {
      const daysSinceDismissal = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 7) {
        return; // Don't show again for 7 days
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallEvent);
      setIsInstallable(true);
      
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setInstallStep('success');
      onInstall?.();
      
      // Clean up dismissed state
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-install-dismissed-time');
      
      // Hide prompt after success animation
      setTimeout(() => {
        setShowPrompt(false);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show manual installation prompt
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowPrompt(true);
        setIsInstallable(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstallStep('installing');
    
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setInstallStep('success');
        onInstall?.();
      } else {
        setInstallStep('prompt');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Installation failed:', error);
      setInstallStep('prompt');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
    onDismiss?.();
  };

  // Don't show if already installed or not installable
  if (isStandalone || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />

          {/* Prompt Modal */}
          <div className="fixed inset-x-0 bottom-0 z-50 lg:inset-0 lg:flex lg:items-center lg:justify-center">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl border-t lg:border border-gray-200 max-w-md w-full mx-auto lg:max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 pb-4">
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>

                <div className="text-center">
                  {/* App Icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-white font-black text-2xl">AF</span>
                  </div>

                  {installStep === 'prompt' && (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Install AstralField
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Get the full app experience with faster loading, offline access, and push notifications.
                      </p>
                    </>
                  )}

                  {installStep === 'installing' && (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Installing...
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Please wait while we install AstralField on your device.
                      </p>
                    </>
                  )}

                  {installStep === 'success' && (
                    <>
                      <h3 className="text-xl font-bold text-green-600 mb-2">
                        Successfully Installed!
                      </h3>
                      <p className="text-gray-600 mb-4">
                        AstralField is now available on your home screen.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Features */}
              {installStep === 'prompt' && (
                <div className="px-6 pb-4">
                  <button
                    onClick={() => setShowFeatures(!showFeatures)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-semibold text-gray-700">
                      Why install the app?
                    </span>
                    {showFeatures ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showFeatures && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 space-y-3"
                      >
                        {features.map((feature, index) => (
                          <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start space-x-3"
                          >
                            <div className="p-2 rounded-lg bg-blue-50">
                              <feature.icon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {feature.title}
                              </h4>
                              <p className="text-xs text-gray-600 mt-1">
                                {feature.description}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* iOS Installation Instructions */}
              {isIOS && installStep === 'prompt' && (
                <div className="px-6 pb-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Smartphone className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        How to install on iOS
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {iosSteps.map((step, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <step.icon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm text-blue-800">{step.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 pt-4 border-t border-gray-100">
                {installStep === 'prompt' && (
                  <div className="space-y-3">
                    {!isIOS ? (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleInstall}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <Download className="h-5 w-5" />
                        <span>Install Now</span>
                      </motion.button>
                    ) : (
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold text-center">
                        Follow the steps above to install
                      </div>
                    )}
                    
                    <button
                      onClick={handleDismiss}
                      className="w-full text-gray-500 py-2 text-sm font-medium"
                    >
                      Maybe Later
                    </button>
                  </div>
                )}

                {installStep === 'installing' && (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-blue-600">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Download className="h-5 w-5" />
                      </motion.div>
                      <span className="font-medium">Installing...</span>
                    </div>
                  </div>
                )}

                {installStep === 'success' && (
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto"
                    >
                      <Check className="h-6 w-6 text-green-600" />
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PWAInstallPrompt;