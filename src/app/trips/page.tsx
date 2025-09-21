'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Trip, dbHelpers } from '@/lib/supabase'

export default function TripsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }

    if (user) {
      loadTrips()
    }
  }, [user, authLoading, router])

  const loadTrips = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const userTrips = await dbHelpers.getUserTrips(user.id)
      setTrips(userTrips)
    } catch (error) {
      console.error('Error loading trips:', error)
      setError('Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  const createNewTrip = async () => {
    if (!user) return

    try {
      const newTrip = await dbHelpers.createTrip({
        title: 'New Trip',
        description: 'Plan your adventure!',
        admin_user_id: user.id,
        trip_data: {},
        collaborator_ids: [],
        is_public: false
      })
      
      router.push(`/trip/${newTrip.id}`)
    } catch (error) {
      console.error('Error creating trip:', error)
      setError('Failed to create trip')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">MQuest</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Your Trips</h2>
          <button
            onClick={createNewTrip}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Create New Trip
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {trips.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">Start planning your first adventure!</p>
            <button
              onClick={createNewTrip}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => router.push(`/trip/${trip.id}`)}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{trip.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{trip.description || 'No description'}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {trip.admin_user_id === user.id ? 'Admin' : 'Collaborator'}
                  </span>
                  <span>
                    {trip.collaborator_ids.length + 1} member{trip.collaborator_ids.length !== 0 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  Updated {new Date(trip.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
