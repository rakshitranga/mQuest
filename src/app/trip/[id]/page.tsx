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
    alert('Share link copied to clipboard!')
  }

  const areAllBoxesConnected = () => {
    if (!canvasData || !canvasData.boxes || !canvasData.connections) return false
    
    const boxes = canvasData.boxes
    const connections = canvasData.connections
    
    if (boxes.length === 0) return false
    if (boxes.length === 1) return true
    if (connections.length === 0) return false
    
    // Build adjacency list
    const adjacencyList: { [key: string]: string[] } = {}
    boxes.forEach((box: any) => {
      adjacencyList[box.id] = []
    })
    
    connections.forEach((conn: any) => {
      adjacencyList[conn.from].push(conn.to)
      adjacencyList[conn.to].push(conn.from)
    })
    
    // Check if all boxes are reachable from the first box (connected graph)
    const visited = new Set<string>()
    const stack = [boxes[0].id]
    
    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue
      
      visited.add(current)
      adjacencyList[current].forEach(neighbor => {
        if (!visited.has(neighbor)) {
          stack.push(neighbor)
        }
      })
    }
    
    return visited.size === boxes.length
  }

  const buildOrderedRoute = () => {
    if (!canvasData || !canvasData.boxes || !canvasData.connections) return []
    
    const boxes = canvasData.boxes
    const connections = canvasData.connections
    
    if (boxes.length === 0) return []
    if (boxes.length === 1) return [boxes[0]]
    
    // Build adjacency list with connection info
    const adjacencyList: { [key: string]: { id: string, fromSide: string, toSide: string }[] } = {}
    boxes.forEach((box: any) => {
      adjacencyList[box.id] = []
    })
    
    connections.forEach((conn: any) => {
      adjacencyList[conn.from].push({ id: conn.to, fromSide: conn.fromSide, toSide: conn.toSide })
      adjacencyList[conn.to].push({ id: conn.from, fromSide: conn.toSide, toSide: conn.fromSide })
    })
    
    // Find endpoints (nodes with only one connection) to start the path
    const endpoints = boxes.filter((box: any) => adjacencyList[box.id].length === 1)
    
    // If no endpoints, start from any box (circular route)
    const startBox = endpoints.length > 0 ? endpoints[0] : boxes[0]
    
    // Traverse the path
    const route = [startBox]
    const visited = new Set([startBox.id])
    let current = startBox.id
    
    while (route.length < boxes.length) {
      const neighbors = adjacencyList[current].filter(neighbor => !visited.has(neighbor.id))
      
      if (neighbors.length === 0) break // No more unvisited neighbors
      
      const nextBox = boxes.find((box: any) => box.id === neighbors[0].id)
      if (nextBox) {
        route.push(nextBox)
        visited.add(nextBox.id)
        current = nextBox.id
      } else {
        break
      }
    }
    
    return route
  }

  const generateGoogleMapsUrl = (route: any[]) => {
    if (route.length === 0) return ''
    
    const baseUrl = 'https://www.google.com/maps/dir/'
    
    // Encode addresses for URL
    const waypoints = route.map(box => {
      const address = box.address && box.address.trim() !== '' ? box.address : box.title
      return encodeURIComponent(address)
    }).join('/')
    
    return baseUrl + waypoints
  }

  const exportToGoogleMaps = () => {
    if (!areAllBoxesConnected()) {
      alert('Please connect all locations with arrows before exporting to Google Maps. All locations must be connected in a single path.')
      return
    }
    
    const route = buildOrderedRoute()
    if (route.length === 0) {
      alert('No locations found to export.')
      return
    }
    
    const googleMapsUrl = generateGoogleMapsUrl(route)
    if (googleMapsUrl) {
      window.open(googleMapsUrl, '_blank')
    } else {
      alert('Unable to generate Google Maps URL.')
    }
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
      address: suggestion.address || suggestion.title // Use actual address from suggestion
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

  const removeAllArrows = () => {
    if (!canvasData) return
    
    const updatedCanvasData = {
      ...canvasData,
      connections: []
    }
    
    setCanvasData(updatedCanvasData)
    setHasUnsavedChanges(true)
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
    <div className="fixed inset-0" style={{
      backgroundImage: 'url(/mquest_bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
    {/* Error banner */}
    {error && (
      <div className="absolute top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 text-red-700 text-center py-2 text-sm">
        {error}
      </div>
    )}

    {/* Top bar */}
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-transparent">
    {/* Left side */}
    <div className="flex items-center gap-4">
      <button
        onClick={handleBackToTrips}
        className="text-sm text-gray-800 hover:text-gray-900 flex items-center gap-1 px-2 py-1 rounded-md bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {isEditingTitle ? (
        <input
          type="text"
          defaultValue={currentTrip?.title || ''}
          autoFocus
          onBlur={(e) => handleTitleSubmit(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          className="text-lg font-semibold text-gray-900 bg-white/80 backdrop-blur-sm border-b border-gray-300 focus:outline-none px-2 py-1 rounded-md"
        />
      ) : (
        <h1
          onDoubleClick={handleTitleDoubleClick}
          className="text-lg font-semibold text-gray-900 cursor-pointer px-2 py-1 rounded-md bg-white/80 backdrop-blur-sm"
          title={isAdmin ? "Double-click to edit" : ""}
        >
          {currentTrip?.title || 'Untitled Trip'}
        </h1>
      )}
    </div>

    {/* Right side */}
    <div className="flex items-center gap-2">
      <button
        onClick={saveCanvasData}
        disabled={isSaving || !canvasData}
        className={`text-sm px-3 py-1.5 rounded-md font-medium backdrop-blur-sm transition-all ${
          isSaving
            ? 'bg-gray-200/90 text-gray-500'
            : hasUnsavedChanges
            ? 'bg-blue-600/90 text-white hover:bg-blue-700/90'
            : 'bg-gray-100/90 text-gray-700'
        }`}
      >
        {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
      </button>

      <button
        onClick={removeAllArrows}
        disabled={!canvasData || canvasData.connections?.length === 0}
        className="text-sm px-3 py-1.5 rounded-md bg-red-600/90 hover:bg-red-700/90 text-white disabled:opacity-50 backdrop-blur-sm transition-all"
      >
        Remove All Arrows
      </button>

      <button
        onClick={exportToGoogleMaps}
        disabled={!canvasData || canvasData.boxes?.length === 0 || !areAllBoxesConnected()}
        className="text-sm px-3 py-1.5 rounded-md bg-green-600/90 hover:bg-green-700/90 text-white disabled:opacity-50 disabled:bg-gray-400/90 backdrop-blur-sm transition-all"
        title={!areAllBoxesConnected() ? "Connect all locations with arrows to export" : "Export route to Google Maps"}
      >
        🗺️ Export to Maps
      </button>

      <button
        onClick={copyShareLink}
        className="text-sm px-3 py-1.5 rounded-md bg-gray-100/90 hover:bg-gray-200/90 text-gray-700 backdrop-blur-sm transition-all"
      >
        Share
      </button>

      {canJoin && (
        <button
          onClick={joinTrip}
          disabled={isJoining}
          className="text-sm px-3 py-1.5 rounded-md bg-blue-600/90 hover:bg-blue-700/90 text-white disabled:opacity-50 backdrop-blur-sm transition-all"
        >
          {isJoining ? 'Joining...' : 'Join'}
        </button>
      )}
      </div>
    </div>

    {/* Toolbar at bottom */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
      <CanvasToolbar />
    </div>

    {/* Canvas full screen */}
    <div className="w-full h-full pt-[56px]">
      <Canvas
        initialData={canvasData}
        onDataChange={(newCanvasData: any) => {
          setCanvasData(newCanvasData)
          setHasUnsavedChanges(true)
        }}
      />
    </div>

    {/* Floating chat + optimize buttons (bottom-right corner) */}
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-40">
      <ChatButton onClick={() => setIsChatOpen(true)} />
      <OptimizeButton onClick={() => setIsOptimizeOpen(true)} />
    </div>

    {/* Modals */}
    <PlanningChat
      isOpen={isChatOpen}
      onClose={() => setIsChatOpen(false)}
      onReopen={() => setIsChatOpen(true)}
      tripTitle={currentTrip?.title || 'Untitled Trip'}
      onAddSuggestionToCanvas={addSuggestionToCanvas}
    />

    <OptimizeModal
      isOpen={isOptimizeOpen}
      onClose={() => setIsOptimizeOpen(false)}
      boxes={canvasData?.boxes || []}
      onOptimize={handleOptimizeRoute}
    />
  </div>

  )
}
