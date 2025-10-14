'use client'

/**
 * Live Page - Rebuilt
 * Live fantasy scoring and updates
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LivePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      // Redirect to live-scores page (consolidated functionality)
      router.push('/live-scores')
    }
  }, [status, router])

  return null
}