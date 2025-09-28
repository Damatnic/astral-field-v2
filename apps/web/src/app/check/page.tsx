import { FeatureCompletenessChecker } from '@/components/testing/feature-completeness-checker'

export default function CheckPage() {
  return (
    <div className="min-h-screen bg-background">
      <FeatureCompletenessChecker />
    </div>
  )
}

export const metadata = {
  title: 'AstralField Feature Check',
  description: 'Verify all application features are complete and working',
}