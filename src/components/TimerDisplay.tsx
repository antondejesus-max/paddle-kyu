import React, { useEffect, useState } from 'react';
import { formatDuration } from '../lib/ladderLogic';
import { Timer } from 'lucide-react';

interface TimerDisplayProps {
  startedAt: number | null;
  isRunning?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  startedAt,
  isRunning = true,
  className = '',
  size = 'md'
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!startedAt || !isRunning) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startedAt) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isRunning]);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-lg px-3.5 py-1.5 gap-2 font-bold'
  };

  return (
    <div
      className={`inline-flex items-center mono-font rounded-full bg-slate-900/90 text-lime-400 border border-lime-500/30 ${sizeClasses[size]} ${className}`}
      title="Match Duration"
    >
      <Timer className={`animate-pulse text-lime-400 ${size === 'lg' ? 'w-5 h-5' : size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
      <span className="tracking-wider">{formatDuration(elapsedSeconds)}</span>
    </div>
  );
};
