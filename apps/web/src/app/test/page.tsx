import { ComprehensiveTestSuite } from '@/components/testing/comprehensive-test-suite'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background">
      <ComprehensiveTestSuite />
    </div>
  )
}

export const metadata = {
  title: 'AstralField Test Suite',
  description: 'Comprehensive testing for all application features',
}