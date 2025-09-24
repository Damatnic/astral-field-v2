import React, { useState } from 'react';
import { MessageCircle, X, Bug, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FeedbackWidget from './FeedbackWidget';
import { useFeedbackTrigger } from '@/hooks/useFeedback';

interface FeedbackButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showQuickActions?: boolean;
}

export default function FeedbackButton({ 
  position = 'bottom-right', 
  showQuickActions = true 
}: FeedbackButtonProps) {
  const {
    isOpen,
    setIsOpen,
    feedbackType,
    triggerFeedback,
    triggerBugReport,
    triggerFeatureRequest
  } = useFeedbackTrigger();

  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const quickMenuPositions = {
    'bottom-right': 'bottom-16 right-0',
    'bottom-left': 'bottom-16 left-0',
    'top-right': 'top-16 right-0',
    'top-left': 'top-16 left-0',
  };

  return (
    <>
      <TooltipProvider>
        <div className={`fixed ${positionClasses[position]} z-40`}>
          {/* Quick action menu */}
          {showQuickActions && showQuickMenu && (
            <div className={`absolute ${quickMenuPositions[position]} mb-2 space-y-2`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white shadow-lg hover:shadow-xl transition-shadow"
                    onClick={() => {
                      triggerBugReport();
                      setShowQuickMenu(false);
                    }}
                  >
                    <Bug className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Report a Bug</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white shadow-lg hover:shadow-xl transition-shadow"
                    onClick={() => {
                      triggerFeatureRequest();
                      setShowQuickMenu(false);
                    }}
                  >
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Suggest a Feature</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Main feedback button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full h-14 w-14 p-0"
                onMouseEnter={() => showQuickActions && setShowQuickMenu(true)}
                onMouseLeave={() => setShowQuickMenu(false)}
                onClick={() => {
                  if (showQuickMenu) {
                    setShowQuickMenu(false);
                  } else {
                    triggerFeedback();
                  }
                }}
              >
                {showQuickMenu ? (
                  <X className="h-6 w-6" />
                ) : (
                  <MessageCircle className="h-6 w-6" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Send Feedback</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Feedback widget modal */}
      <FeedbackWidget
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialType={feedbackType}
      />
    </>
  );
}

// Keyboard shortcut version for power users
export function FeedbackShortcut() {
  const { triggerFeedback } = useFeedbackTrigger();

  React.useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + F to trigger feedback
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        triggerFeedback();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [triggerFeedback]);

  return null;
}