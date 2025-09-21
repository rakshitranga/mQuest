'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Trip, User, dbHelpers } from '@/lib/supabase'
import Canvas from '@/components/Canvas'
import CanvasToolbar from '@/components/CanvasToolbar'
import ChatButton from '@/components/ChatButton'
import PlanningChat from '@/components/PlanningChat'
import OptimizeButton from '@/components/OptimizeButton'
import OptimizeModal from '@/components/OptimizeModal'

export default function TripPage() {
  const { user, supabaseUser, loading: authLoading } = useAuth()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [canvasData, setCanvasData] = useState<any>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isOptimizeOpen, setIsOptimizeOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string

  // Load canvas data immediately from cache on component mount
  useEffect(() => {
    if (tripId) {
      // Try to load from localStorage immediately
      const savedCanvasData = localStorage.getItem(`canvas-${tripId}`)
      if (savedCanvasData) {
        try {
          const parsedData = JSON.parse(savedCanvasData)
          setCanvasData(parsedData)
          console.log('Loaded canvas from localStorage cache')
        } catch (error) {
          console.error('Error parsing localStorage canvas data:', error)
          setCanvasData({ boxes: [], connections: [] })
        }
      } else {
        setCanvasData({ boxes: [], connections: [] })
      }
    }
  }, [tripId])

  const loadTrip = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true)
      }
      
      // Load trip data from database (for metadata, permissions, etc.)
      const tripData = await dbHelpers.getTripById(tripId)
      setTrip(tripData)
      setRetryCount(0) // Reset retry count on success
      setError(null) // Clear any previous errors
      
      // Only load database canvas data if we don't have localStorage data
      if (!canvasData || (canvasData.boxes?.length === 0 && canvasData.connections?.length === 0)) {
        if (tripData.trip_data?.canvas) {
          setCanvasData(tripData.trip_data.canvas)
          // Cache it immediately to localStorage
          localStorage.setItem(`canvas-${tripId}`, JSON.stringify(tripData.trip_data.canvas))
          console.log('Loaded canvas from database and cached to localStorage')
        }
      }
      
      console.log('Successfully loaded trip from database')
      
    } catch (error) {
      console.error(`Error loading trip (attempt ${retryCount + 1}):`, error)
      
      // Keep localStorage data even if database fails
      if (!canvasData) {
        setCanvasData({ boxes: [], connections: [] })
      }
      
      // Retry logic with exponential backoff
      const newRetryCount = retryCount + 1
      setRetryCount(newRetryCount)
      
      if (newRetryCount <= 10) { // Max 10 retries
        const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 30000) // Cap at 30 seconds
        setError(`Retrying database connection... (attempt ${newRetryCount}/10)`)
        
        setTimeout(() => {
          console.log(`Retrying database load in ${delay}ms (attempt ${newRetryCount})`)
          loadTrip(true)
        }, delay)
      } else {
        setError('Unable to connect to database. Working in offline mode.')
      }
    } finally {
      if (!isRetry) {
        setLoading(false)
      }
    }
  }, [tripId, canvasData, retryCount])

  useEffect(() => {
    if (!authLoading && !supabaseUser) {
      router.push('/')
      return
    }

    // Wait for both supabaseUser AND user profile to be ready before loading trip
    if (supabaseUser && user && tripId) {
      loadTrip()
    }
  }, [supabaseUser, user, authLoading, tripId, router, loadTrip])

  // Note: Canvas data is only cached when user explicitly saves

  const joinTrip = async () => {
    if (!user || !currentTrip) return

    try {
      setIsJoining(true)
      await dbHelpers.addCollaboratorToTrip(currentTrip?.id || tripId, user?.id || '')
      await loadTrip() // Reload trip data
    } catch (error) {
      console.error('Error joining trip:', error)
      setError('Failed to join trip')
    } finally {
      setIsJoining(false)
    }
  }

  const updateTrip = async (updates: Partial<Trip>) => {
    if (!currentTrip) return

    try {
      const updatedTrip = await dbHelpers.updateTrip(currentTrip.id, updates)
      setTrip(updatedTrip)
    } catch (error) {
      console.error('Error updating trip:', error)
      setError('Failed to update trip')
    }
  }

  const saveCanvasData = async () => {
    if (!currentTrip || !canvasData) return

    try {
      setIsSaving(true)
      const updatedTrip = await dbHelpers.updateTrip(currentTrip?.id || tripId, {
        trip_data: {
          ...currentTrip?.trip_data,
          canvas: canvasData
        }
      })
      setTrip(updatedTrip)
      setHasUnsavedChanges(false)
      setError(null)
      
      // Cache to localStorage only when user explicitly saves
      localStorage.setItem(`canvas-${tripId}`, JSON.stringify(canvasData))
      console.log('Canvas data saved to database and cached to localStorage')
      
    } catch (error) {
      console.error('Error saving canvas:', error)
      setError('Failed to save canvas data')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBackToTrips = async () => {
    // Auto-save before navigating away
    if (canvasData) {
      await saveCanvasData()
    }
    router.push('/trips')
  }

  const handleTitleDoubleClick = () => {
    const isAdmin = currentTrip?.admin_user_id === user?.id
    if (isAdmin) {
      setIsEditingTitle(true)
    }
  }

  const handleTitleSubmit = async (newTitle: string) => {
    if (currentTrip && newTitle.trim() && newTitle !== currentTrip.title) {
      await updateTrip({ title: newTitle.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSubmit((e.target as HTMLInputElement).value)
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
    }
  }

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/trip/${tripId}`
    navigator.clipboard.writeText(shareUrl)
    // You could add a toast notification here
    alert('Share link copied to clipboard!')
  }

  const addSuggestionToCanvas = (suggestion: any) => {
    // Use current state instead of localStorage to avoid parsing
    const currentCanvasData = canvasData || { boxes: [], connections: [] }
    const currentBoxes = currentCanvasData.boxes || []
    
    const newBox = {
      id: `suggestion-${Date.now()}`,
      x: 50, // Bottom left corner - x position
      y: window.innerHeight - 200, // Bottom left corner - y position
      title: suggestion.title,
      description: suggestion.description,
      address: suggestion.title // Use title as default address
    }
    
    const updatedCanvasData = {
      ...currentCanvasData,
      boxes: [...currentBoxes, newBox]
    }
    
    // Update state immediately (localStorage will be updated by useEffect)
    setCanvasData(updatedCanvasData)
    setHasUnsavedChanges(true)
  }

  const handleOptimizeRoute = async (startBoxId: string, endBoxId: string) => {
    if (!canvasData) return

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boxes: canvasData.boxes || [],
          startBoxId,
          endBoxId
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update canvas with optimized connections
        const updatedCanvasData = {
          ...canvasData,
          connections: data.connections
        }
        
        setCanvasData(updatedCanvasData)
        setHasUnsavedChanges(true)
        
        alert(`Optimized route found with ${data.path.length} stops!`)
      } else {
        throw new Error(data.error || 'Failed to optimize route')
      }
    } catch (error) {
      console.error('Route optimization failed:', error)
      throw error
    }
  }

  // Redirect if not authenticated (check supabaseUser for actual auth state)
  if (!authLoading && !supabaseUser) {
    return null // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/trips')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Trips
          </button>
        </div>
      </div>
    )
  }

  // Don't show "Trip Not Found" if we have canvas data from localStorage
  if (!trip && !canvasData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Trip Not Found</h2>
          <p className="text-gray-600 mb-6">The trip you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => router.push('/trips')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Trips
          </button>
        </div>
      </div>
    )
  }

  // Create fallback trip data if we have canvas data but no trip from database
  const fallbackTrip: Trip | null = !trip && canvasData ? {
    id: tripId,
    title: `Trip ${tripId.slice(0, 8)}`,
    description: 'Offline Trip',
    admin_user_id: user?.id || '',
    collaborator_ids: [],
    is_public: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    trip_data: { canvas: canvasData }
  } : null

  const currentTrip = trip || fallbackTrip
  const isAdmin = currentTrip?.admin_user_id === user?.id
  const isCollaborator = currentTrip?.collaborator_ids.includes(user?.id || '') || false
  const canJoin = !isAdmin && !isCollaborator

  return (
    <div className="fixed inset-0 bg-gray-50">
      {/* Error message overlay */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {/* Navigation overlay buttons */}
      <div className="absolute top-4 left-4 z-50 flex items-center space-x-4">
        <button
          onClick={handleBackToTrips}
          className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 px-4 py-2 rounded-lg shadow-md transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Trips
        </button>
        
        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md">
          {isEditingTitle ? (
            <input
              type="text"
              defaultValue={currentTrip?.title || ''}
              autoFocus
              onBlur={(e) => handleTitleSubmit(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none focus:bg-white rounded px-1 min-w-0"
              style={{ width: `${Math.max((currentTrip?.title || '').length * 0.6, 8)}ch` }}
            />
          ) : (
            <h1 
              className="text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 rounded px-1 py-1 transition-colors"
              onDoubleClick={handleTitleDoubleClick}
              title={currentTrip?.admin_user_id === user?.id ? "Double-click to edit" : ""}
            >
              {currentTrip?.title || 'Untitled Trip'}
            </h1>
          )}
        </div>

        <button
          onClick={saveCanvasData}
          disabled={isSaving || !canvasData}
          className={`${
            hasUnsavedChanges 
              ? 'bg-orange-600 hover:bg-orange-700' 
              : 'bg-green-600 hover:bg-green-700'
          } disabled:bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md font-medium transition-colors flex items-center gap-2`}
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : hasUnsavedChanges ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <div className="absolute top-4 right-4 z-50 flex flex-col items-end space-y-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={copyShareLink}
            className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 px-4 py-2 rounded-lg shadow-md transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share Link
          </button>
          
          {canJoin && (
            <button
              onClick={joinTrip}
              disabled={isJoining}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md font-medium transition-colors disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : 'Join Trip'}
            </button>
          )}
        </div>
        
        {/* Export button moved under share button */}
        <button
          onClick={() => {
            if (canvasData) {
              const blob = new Blob([JSON.stringify(canvasData, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${currentTrip?.title || 'trip'}-canvas.json`;
              link.click();
              URL.revokeObjectURL(url);
            }
          }}
          disabled={!canvasData}
          className="bg-white/90 backdrop-blur-sm hover:bg-white disabled:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-md transition-colors flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </button>
      </div>

      {/* Toolbar centered at bottom */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <CanvasToolbar />
      </div>

      {/* Full-screen Canvas */}
      <div className="w-full h-full">
        <Canvas
          initialData={canvasData}
          onDataChange={(newCanvasData: any) => {
            setCanvasData(newCanvasData);
            setHasUnsavedChanges(true);
          }}
        />
      </div>

      {/* Chat Button */}
      <ChatButton 
        onClick={() => setIsChatOpen(true)}
      />

      {/* Optimize Button */}
      <OptimizeButton 
        onClick={() => setIsOptimizeOpen(true)}
      />

      {/* Planning Chat */}
      <PlanningChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onReopen={() => setIsChatOpen(true)}
        tripTitle={currentTrip?.title || 'Untitled Trip'}
        onAddSuggestionToCanvas={addSuggestionToCanvas}
      />

      {/* Optimize Modal */}
      <OptimizeModal
        isOpen={isOptimizeOpen}
        onClose={() => setIsOptimizeOpen(false)}
        boxes={canvasData?.boxes || []}
        onOptimize={handleOptimizeRoute}
      />
    </div>
  )
}
