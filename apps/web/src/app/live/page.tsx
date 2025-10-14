/**
 * Live Page - Rebuilt
 * Live fantasy scoring and updates
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { Activity } from 'lucide-react'

export default async function LivePage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Redirect to live-scores page (consolidated functionality)
  redirect('/live-scores')
}
