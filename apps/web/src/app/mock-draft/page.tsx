import { Metadata } from 'next'
import { MockDraftView } from '@/components/mock-draft/MockDraftView'

export const metadata: Metadata = {
  title: 'Mock Draft | AstralField',
  description: 'Practice your draft strategy with AI opponents',
}

export default function MockDraftPage() {
  return <MockDraftView />
}

