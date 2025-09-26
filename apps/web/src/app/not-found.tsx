import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-white">404</h1>
          <h2 className="text-2xl font-semibold text-slate-300">Page Not Found</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/"
            className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4"
          >
            Return Home
          </Link>
          <Link 
            href="/auth/signin"
            className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-600 text-slate-300 hover:bg-slate-700 h-10 px-4"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}