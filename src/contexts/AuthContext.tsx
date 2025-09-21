'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User, dbHelpers } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  clearSession: () => Promise<void>
  retryDatabaseConnection: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Debug function to check session state
  const debugSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('Current session debug:', {
      hasSession: !!session,
      user: session?.user?.email,
      expiresAt: session?.expires_at,
      error: error
    })
  }

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - setting loading to false')
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    // Get initial session with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(loadingTimeout)
      
      if (error) {
        console.error('Error getting session:', error)
        setLoading(false)
        return
      }
      
      console.log('Initial session:', session?.user?.email || 'No session')
      setSupabaseUser(session?.user ?? null)
      
      if (session?.user) {
        loadUserProfile(session.user)
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      clearTimeout(loadingTimeout)
      console.error('Session retrieval failed:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No user')
      
      // Handle different auth events
      if (event === 'SIGNED_OUT') {
        setSupabaseUser(null)
        setUser(null)
        setLoading(false)
        // Clear any cached data
        localStorage.clear()
        return
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed for:', session?.user?.email)
      }
      
      setSupabaseUser(session?.user ?? null)
      
      if (session?.user) {
        await loadUserProfile(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (sessionUser?: any) => {
    try {
      // Add timeout for database call with longer timeout
      const profilePromise = dbHelpers.getCurrentUser()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 8000)
      )
      
      const userProfile = await Promise.race([profilePromise, timeoutPromise])
      setUser(userProfile as any)
      console.log('✅ Successfully loaded user profile from database')
    } catch (error) {
      const isTimeout = error instanceof Error && error.message.includes('timeout')
      
      if (isTimeout) {
        console.warn('⏰ Database connection timeout - using session data fallback')
      } else {
        console.error('❌ Database error loading user profile:', error)
      }
      
      // Use the passed sessionUser or fallback to supabaseUser
      const currentUser = sessionUser || supabaseUser
      
      // If user profile doesn't exist, create a temporary user object
      if (currentUser) {
        const tempUser = {
          id: currentUser.id,
          email: currentUser.email!,
          name: currentUser.user_metadata?.name || currentUser.email!.split('@')[0],
          avatar_url: currentUser.user_metadata?.avatar_url || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUser(tempUser)
        
        if (isTimeout) {
          console.log('🔄 Using temporary user profile (database offline)')
        } else {
          console.log('👤 Created temporary user profile from session data')
        }
      } else {
        setUser(null)
        console.log('❌ No session user available, setting user to null')
      }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with email:', error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      })
      if (error) throw error
      
      // Note: User profile will be created automatically by database trigger
      // or handled by the auth state change listener when user signs in
      
    } catch (error) {
      console.error('Error signing up with email:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null)
      setSupabaseUser(null)
      
      // Clear all localStorage data
      localStorage.clear()
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      console.log('Successfully signed out and cleared all data')
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const clearSession = async () => {
    try {
      console.log('Force clearing all session data...')
      
      // Clear local state
      setUser(null)
      setSupabaseUser(null)
      setLoading(false)
      
      // Clear localStorage
      localStorage.clear()
      
      // Clear session cookies by signing out
      await supabase.auth.signOut()
      
      // Clear any remaining browser storage
      if (typeof window !== 'undefined') {
        sessionStorage.clear()
        // Clear Supabase specific cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
      
      console.log('All session data cleared')
    } catch (error) {
      console.error('Error clearing session:', error)
    }
  }

  const retryDatabaseConnection = async () => {
    if (supabaseUser) {
      console.log('🔄 Retrying database connection...')
      await loadUserProfile(supabaseUser)
    } else {
      console.warn('No Supabase user available for retry')
    }
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearSession,
    retryDatabaseConnection,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
