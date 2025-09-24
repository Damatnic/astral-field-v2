import React, { useEffect, useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface DraftTimerProps {
  timeRemaining: number;
  isMyTurn: boolean;
}

export default function DraftTimer({ timeRemaining, isMyTurn }: DraftTimerProps) {
  const [localTime, setLocalTime] = useState(timeRemaining);

  useEffect(() => {
    setLocalTime(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (!isMyTurn) return 'text-gray-600';
    if (localTime <= 10) return 'text-red-600 animate-pulse';
    if (localTime <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`flex items-center space-x-2 ${getTimerColor()}`}>
      <ClockIcon className="h-5 w-5" />
      <span className="font-mono text-lg font-medium">
        {formatTime(localTime)}
      </span>
    </div>
  );
}