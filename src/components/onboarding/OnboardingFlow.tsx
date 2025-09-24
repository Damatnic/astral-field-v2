import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
  ChartBarIcon,
  BellIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ onNext: () => void; onSkip?: () => void }>;
  required?: boolean;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AstralField',
    description: 'The ultimate fantasy football experience',
    icon: StarIcon,
    component: WelcomeStep,
    required: true
  },
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Tell us a bit about yourself',
    icon: UsersIcon,
    component: ProfileStep,
    required: true
  },
  {
    id: 'notifications',
    title: 'Enable Notifications',
    description: 'Stay updated with push notifications',
    icon: BellIcon,
    component: NotificationStep,
    required: false
  },
  {
    id: 'league-setup',
    title: 'Join or Create League',
    description: 'Get started with your first league',
    icon: TrophyIcon,
    component: LeagueSetupStep,
    required: false
  },
  {
    id: 'tutorial',
    title: 'Platform Tutorial',
    description: 'Learn the key features',
    icon: ChartBarIcon,
    component: TutorialStep,
    required: false
  }
];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding before
    if (session?.user?.onboardingCompleted) {
      onComplete();
    }
  }, [session, onComplete]);

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const canSkip = !currentStepData.required;

  const handleNext = async () => {
    setIsLoading(true);
    
    try {
      // Mark current step as completed
      setCompletedSteps(prev => [...prev, currentStepData.id]);

      if (isLastStep) {
        await completeOnboarding();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error progressing onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (canSkip) {
      if (isLastStep) {
        completeOnboarding();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const completeOnboarding = async () => {
    try {
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedSteps })
      });

      if (response.ok) {
        // Update session to reflect onboarding completion
        await update({ onboardingCompleted: true });
        toast.success('Welcome to AstralField! 🎉');
        onComplete();
      } else {
        throw new Error('Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding');
    }
  };

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Getting Started</h1>
            <span className="text-sm text-gray-600">
              Step {currentStep + 1} of {onboardingSteps.length}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          {/* Step Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <currentStepData.icon className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600">
              {currentStepData.description}
            </p>
          </div>

          {/* Step Component */}
          <currentStepData.component 
            onNext={handleNext}
            onSkip={canSkip ? handleSkip : undefined}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ChevronLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>

          <div className="flex space-x-3">
            {canSkip && (
              <button
                onClick={handleSkip}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Skip
              </button>
            )}
            
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {isLastStep ? 'Complete' : 'Next'}
                  {!isLastStep && <ChevronRightIcon className="h-5 w-5 ml-2" />}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center mt-6 space-x-2">
          {onboardingSteps.map((step, index) => (
            <div
              key={step.id}
              className={`w-3 h-3 rounded-full transition-colors ${
                index <= currentStep
                  ? 'bg-blue-600'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Individual Step Components

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <TrophyIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">Draft & Manage</h3>
          <p className="text-sm text-gray-600">Build your championship team</p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <ChartBarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">Live Scoring</h3>
          <p className="text-sm text-gray-600">Real-time updates and analytics</p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg">
          <UsersIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">Social Features</h3>
          <p className="text-sm text-gray-600">Trade, chat, and compete</p>
        </div>
      </div>
      
      <p className="text-gray-600">
        Welcome to the most advanced fantasy football platform. Let's get you set up in just a few minutes!
      </p>
    </div>
  );
}

function ProfileStep({ onNext }: { onNext: () => void }) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState({
    favoriteTeam: '',
    experienceLevel: '',
    notifications: true
  });

  const handleSave = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        onNext();
      } else {
        toast.error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Something went wrong');
    }
  };

  const nflTeams = [
    'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
    'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
    'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
    'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
    'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
    'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
    'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
    'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders'
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Favorite NFL Team (Optional)
        </label>
        <select
          value={profile.favoriteTeam}
          onChange={(e) => setProfile({ ...profile, favoriteTeam: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a team...</option>
          {nflTeams.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fantasy Football Experience
        </label>
        <div className="space-y-2">
          {[
            { value: 'beginner', label: 'Beginner (0-2 years)' },
            { value: 'intermediate', label: 'Intermediate (3-5 years)' },
            { value: 'advanced', label: 'Advanced (6+ years)' },
            { value: 'expert', label: 'Expert (10+ years)' }
          ].map(option => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name="experience"
                value={option.value}
                checked={profile.experienceLevel === option.value}
                onChange={(e) => setProfile({ ...profile, experienceLevel: e.target.value })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Save Profile
      </button>
    </div>
  );
}

function NotificationStep({ onNext, onSkip }: { onNext: () => void; onSkip?: () => void }) {
  const [permissions, setPermissions] = useState<{
    supported: boolean;
    granted: boolean;
  }>({ supported: false, granted: false });

  useEffect(() => {
    if ('Notification' in window) {
      setPermissions({
        supported: true,
        granted: Notification.permission === 'granted'
      });
    }
  }, []);

  const enableNotifications = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        // Request notification permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // Register service worker and subscribe to push
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          });

          // Send subscription to server
          const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription })
          });

          if (response.ok) {
            toast.success('Notifications enabled successfully!');
            onNext();
          } else {
            throw new Error('Failed to subscribe');
          }
        } else {
          toast.error('Notification permission denied');
          onSkip?.();
        }
      } else {
        toast.error('Push notifications not supported');
        onSkip?.();
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
      onSkip?.();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <BellIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Stay in the Loop
        </h3>
        <p className="text-gray-600 mb-6">
          Get notified about draft picks, trade proposals, scoring updates, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Draft Notifications</h4>
          <p className="text-sm text-gray-600">
            Get alerted when it's your turn to pick
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Trade Alerts</h4>
          <p className="text-sm text-gray-600">
            Know immediately when you receive trade offers
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Score Updates</h4>
          <p className="text-sm text-gray-600">
            Get updates during close games
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">League News</h4>
          <p className="text-sm text-gray-600">
            Stay updated on league announcements
          </p>
        </div>
      </div>

      {permissions.supported ? (
        permissions.granted ? (
          <div className="text-center">
            <CheckIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-600">Notifications already enabled!</p>
            <button
              onClick={onNext}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        ) : (
          <button
            onClick={enableNotifications}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enable Notifications
          </button>
        )
      ) : (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Notifications aren't supported in this browser, but you can still use all other features!
          </p>
          <button
            onClick={onSkip}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Continue Without Notifications
          </button>
        </div>
      )}
    </div>
  );
}

function LeagueSetupStep({ onNext }: { onNext: () => void }) {
  const router = useRouter();
  const [choice, setChoice] = useState<'join' | 'create' | null>(null);

  const handleChoice = (selectedChoice: 'join' | 'create') => {
    setChoice(selectedChoice);
    
    if (selectedChoice === 'join') {
      router.push('/leagues/join');
    } else if (selectedChoice === 'create') {
      router.push('/leagues/create');
    }
    
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <TrophyIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Ready to Play?
        </h3>
        <p className="text-gray-600 mb-6">
          You can join an existing league or create your own.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => handleChoice('join')}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <UsersIcon className="h-12 w-12 text-gray-400 group-hover:text-blue-600 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Join League</h4>
          <p className="text-gray-600 text-sm">
            Join an existing league with friends or find a public league to compete in.
          </p>
        </button>

        <button
          onClick={() => handleChoice('create')}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <CogIcon className="h-12 w-12 text-gray-400 group-hover:text-blue-600 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Create League</h4>
          <p className="text-gray-600 text-sm">
            Start your own league, customize settings, and invite friends to join.
          </p>
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          I'll do this later
        </button>
      </div>
    </div>
  );
}

function TutorialStep({ onNext }: { onNext: () => void }) {
  const [currentTip, setCurrentTip] = useState(0);
  
  const tips = [
    {
      title: 'Draft Like a Pro',
      description: 'Use our draft assistant to get real-time player rankings and suggestions during your draft.',
      icon: TrophyIcon
    },
    {
      title: 'Smart Trading',
      description: 'Our trade analyzer evaluates fairness and helps you make better trading decisions.',
      icon: ChartBarIcon
    },
    {
      title: 'Live Scoring',
      description: 'Watch your scores update in real-time during games with detailed player statistics.',
      icon: StarIcon
    }
  ];

  const currentTipData = tips[currentTip];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <currentTipData.icon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {currentTipData.title}
        </h3>
        <p className="text-gray-600 mb-6">
          {currentTipData.description}
        </p>
      </div>

      <div className="flex justify-center space-x-2">
        {tips.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentTip(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentTip ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentTip(Math.max(0, currentTip - 1))}
          disabled={currentTip === 0}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentTip === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Previous Tip
        </button>

        {currentTip === tips.length - 1 ? (
          <button
            onClick={onNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started!
          </button>
        ) : (
          <button
            onClick={() => setCurrentTip(currentTip + 1)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Next Tip
          </button>
        )}
      </div>
    </div>
  );
}