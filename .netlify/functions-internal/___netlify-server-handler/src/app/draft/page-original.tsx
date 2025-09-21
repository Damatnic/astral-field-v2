'use client';

import React from 'react';
import DraftRoom from '@/components/draft/DraftRoom';
import { useAuth } from '@/components/AuthProvider';

export default function DraftPage() {
  const { user } = useAuth();
  
  // In a real app, you'd get the draftId from URL params or API
  const draftId = 'damato-dynasty-2025-draft';
  
  return <DraftRoom draftId={draftId} userId={user?.id} />;
}