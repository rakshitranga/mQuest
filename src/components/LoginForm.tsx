'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginForm() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
      setError('Failed to sign in with Google. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (isSignUp && !name) {
      setError('Please enter your name.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      if (isSignUp) {
        await signUpWithEmail(email, password, name)
        setError('Account created! Please check your email to verify your account.')
      } else {
        await signInWithEmail(email, password)
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setError(error.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] text-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-8">
          <div className="text-center">
            {/* Logo/Title */}
            <h1 className="text-3xl font-bold mb-2 text-gray-900">MQuest</h1>
            <p className="text-sm text-gray-500">Collaborative Trip Planning</p>
          </div>

          {/* Error/Success message */}
          {error && (
            <div
              className={`p-3 text-sm rounded-lg border ${
                error.includes('Account created')
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {error}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-200 outline-none"
                disabled={loading}
              />
            )}

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-200 outline-none"
              disabled={loading}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-200 outline-none"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md transition disabled:opacity-50"
            >
              {loading ? (isSignUp ? 'Creating...' : 'Signing in...') : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setEmail('')
                setPassword('')
                setName('')
              }}
              className="text-sm text-blue-600 hover:underline"
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don’t have an account? Sign Up"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Google Sign in button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center border border-gray-300 rounded-md py-2 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
