'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { Trip, dbHelpers } from '@/lib/supabase'

export default function TripsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
    if (user) loadTrips()
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

  const confirmDelete = (trip: Trip) => {
    setTripToDelete(trip)
    setShowDeleteModal(true)
  }

  const deleteTrip = async () => {
    if (!tripToDelete) return
    try {
      setDeletingTripId(tripToDelete.id)
      await dbHelpers.deleteTrip(tripToDelete.id)
      setTrips((prev) => prev.filter((t) => t.id !== tripToDelete.id))
    } catch (error) {
      console.error('Error deleting trip:', error)
      setError('Failed to delete trip')
    } finally {
      setDeletingTripId(null)
      setShowDeleteModal(false)
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
      <div className="min-h-screen flex items-center justify-center bg-[#dbe6d3]">
        <p className="text-gray-700">Loading your trips...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="relative min-h-screen flex bg-[#dbe6d3] text-gray-800">
      {/* Left Panel - Trip List */}
      <div className="w-full md:w-1/2 lg:w-2/5 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">MQuest</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </button>
        </header>

        <h2 className="text-xl font-semibold mb-4">Your Trips</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        {trips.length === 0 ? (
          <p className="text-gray-600">No trips yet. Start planning your first adventure!</p>
        ) : (
          <ul className="space-y-3">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="flex justify-between items-center bg-[#f3e8d0] rounded-lg shadow-sm px-4 py-3 border border-[#e5dcc5] hover:bg-[#f0e3c9] transition cursor-pointer"
                onClick={() => router.push(`/trip/${trip.id}`)}
              >
                <div>
                  <h3 className="font-medium">{trip.title}</h3>
                  <p className="text-sm text-gray-600">
                    {trip.description || 'No description'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmDelete(trip)
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right Panel - Decorative Image */}
      <div className="hidden md:block relative w-1/2 lg:w-3/5">
        <img src="/bg-venice.jpg" alt="Venice" className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-l from-[#dbe6d3] via-[#dbe6d3]/70 to-transparent" />
      </div>

      {/* Floating New Trip Button */}
      <button
        onClick={createNewTrip}
        className="fixed bottom-8 right-8 bg-[#3b7d4f] hover:bg-[#2f633e] text-white px-6 py-3 rounded-full shadow-md"
      >
        + New Trip
      </button>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && tripToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-2">Delete Trip</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{tripToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={deleteTrip}
                disabled={deletingTripId === tripToDelete.id}
                className="px-4 py-2 rounded bg-[#b94b4b] hover:bg-[#9a3f3f] text-white"
              >
                {deletingTripId === tripToDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
