'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/LoginForm'

export default function Home() {
  const { user, supabaseUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('Home page auth state:', { user: !!user, supabaseUser: !!supabaseUser, loading })
    
    if (!loading && user) {
      console.log('Redirecting to trips page...')
      router.push('/trips')
    }
  }, [user, supabaseUser, loading, router])

  // Add timeout fallback for loading state
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing render')
      }
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeout)
  }, [loading])

  console.log('Home page render state:', { loading, hasUser: !!user, hasSupabaseUser: !!supabaseUser })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-xs text-gray-400 mt-2">
            Auth: {loading ? 'Loading' : 'Ready'} | User: {user ? 'Found' : 'None'} | Supabase: {supabaseUser ? 'Found' : 'None'}
          </p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to trips...</p>
        </div>
      </div>
    )
  }

  return <LoginForm />
}
