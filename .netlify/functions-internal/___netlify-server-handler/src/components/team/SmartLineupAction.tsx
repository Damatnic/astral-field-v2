'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { handleComponentError } from '@/lib/error-handling';

interface SmartLineupActionProps {
  index: number;
}

export default function SmartLineupAction({ index }: SmartLineupActionProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleLineupClick = async () => {
    setIsNavigating(true);
    try {
      const response = await fetch('/api/my-team');
      const data = await response.json();
      
      if (data.success && data.data) {
        router.push(`/teams/${data.data.id}/lineup` as any);
      } else {
        // Fallback to leagues if no team found
        router.push('/leagues' as any);
      }
    } catch (error) {
      handleComponentError(error as Error, 'component');
      router.push('/leagues' as any);
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <button
        onClick={handleLineupClick}
        disabled={isNavigating}
        className="w-full text-left block bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-75"
      >
        <div className="flex items-center justify-between mb-4">
          <Users className="h-8 w-8 group-hover:scale-110 transition-transform duration-200" />
          <span className="text-xs opacity-75 bg-white/20 rounded-full px-3 py-1">
            {isNavigating ? 'Loading...' : '2 changes needed'}
          </span>
        </div>
        <h3 className="font-semibold text-lg mb-2">Set Lineup</h3>
        <p className="text-sm opacity-90 mb-2">Optimize your starting lineup</p>
      </button>
    </motion.div>
  );
}