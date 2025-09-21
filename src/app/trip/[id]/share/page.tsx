'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { dbHelpers } from '@/lib/supabase'
import Canvas from '@/components/Canvas'
import Link from 'next/link'

interface Trip {
  id: string
  title: string
  description?: string
  trip_data: Record<string, unknown>
  created_at: string
  admin_user_id: string
}

export default function ShareTripPage() {
  const params = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const data = await dbHelpers.getTripById(params.id as string)
        
        setTrip(data)
        
        // Extract canvas data from trip_data
        const canvasData = data.trip_data.canvas as { boxes?: any[], connections?: any[] }
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load trip')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchTrip()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#dbe6d3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading shared trip...</p>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-[#dbe6d3] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Trip Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'This trip does not exist or is not available for sharing.'}</p>
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Go to mQuest
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#dbe6d3] text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src="/mquest_logo.png" alt="MQuest Logo" className="w-16" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">{trip.title}</h1>
              <p className="text-sm text-gray-600">Shared Trip - Read Only</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Created: {new Date(trip.created_at).toLocaleDateString()}
            </span>
            <Link 
              href="/" 
              className="px-4 py-2 bg-[#D2B48C] text-white rounded-lg hover:bg-[#C19A6B] transition-colors"
            >
              Create Your Own Trip
            </Link>
          </div>
        </div>
      </header>

      {/* Trip Description */}
      {trip.description && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-gray-700">{trip.description}</p>
          </div>
        </div>
      )}

      {/* Read-only Canvas */}
      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Read-only notice */}
            <div className="bg-yellow-50 border-b border-yellow-200 p-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-yellow-800 font-medium">
                  This is a read-only view of a shared trip. You cannot make changes to this trip.
                </span>
              </div>
            </div>
            
            {/* Canvas container */}
            <div className="h-[600px] relative">
              <ReadOnlyCanvas 
                initialData={{
                  boxes: ((trip.trip_data as { canvas?: { boxes?: any[] } })?.canvas?.boxes) || [],
                  connections: ((trip.trip_data as { canvas?: { connections?: any[] } })?.canvas?.connections) || []
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 p-4 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-semibold">mQuest</span> - Collaborative Trip Planning
          </p>
        </div>
      </footer>
    </div>
  )
}

// Read-only version of Canvas component
function ReadOnlyCanvas({ initialData }: { initialData: { boxes: any[], connections: any[] } | null }) {
  // Handle null or undefined data
  const safeData = initialData || { boxes: [], connections: [] }
  const boxes = safeData.boxes || []
  const connections = safeData.connections || []

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50">
      {/* Debug info */}
      {boxes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No trip data to display</p>
            <p className="text-sm">Boxes: {boxes.length}, Connections: {connections.length}</p>
          </div>
        </div>
      )}
      
      {/* Zoomed out canvas container */}
      <div 
        className="absolute inset-0 origin-top-left"
        style={{ 
          transform: 'scale(0.9)',
          transformOrigin: 'top left'
        }}
      >
      
      {/* Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connections.map((conn, idx) => {
          const fromBox = boxes.find(b => b.id === conn.from)
          const toBox = boxes.find(b => b.id === conn.to)
          if (!fromBox || !toBox) return null

          const getAttachmentPoint = (box: any, side: string) => {
            const isSmallBox = box.id.startsWith('gas-station-') || box.id.startsWith('landmark-')
            const width = isSmallBox ? 192 : 320
            const height = isSmallBox ? 96 : 160
            return {
              x: box.x + width / 2,
              y: side === "top" ? box.y : box.y + height,
            }
          }

          const from = getAttachmentPoint(fromBox, conn.fromSide)
          const to = getAttachmentPoint(toBox, conn.toSide)
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2

          return (
            <g key={idx}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="black"
                strokeWidth={2}
              />
              {conn.duration && conn.duration !== 'Unknown' && (
                <>
                  <rect
                    x={midX - 25}
                    y={midY - 10}
                    width={50}
                    height={20}
                    fill="white"
                    stroke="#d1d5db"
                    strokeWidth={1}
                    rx={4}
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    className="text-xs fill-gray-700"
                  >
                    {conn.duration}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>

      {/* Boxes */}
      {boxes.map((box) => {
        console.log('Rendering box:', box)
        const isGasStation = box.id.startsWith('gas-station-')
        const isLandmark = box.id.startsWith('landmark-')
        const isSmallBox = isGasStation || isLandmark
        
        return (
          <div
            key={box.id}
            className={`absolute rounded-xl shadow-md border-4 text-black ${
              isSmallBox 
                ? `w-48 h-24 p-2 ${isGasStation ? 'border-blue-600' : 'border-purple-600'}` 
                : 'border-amber-600 w-80 h-40 p-4'
            }`}
            style={{ 
              left: box.x, 
              top: box.y,
              backgroundColor: isGasStation ? '#e0f2fe' : isLandmark ? '#faf5ff' : 'tan'
            }}
          >
            <div className="h-full overflow-hidden">
              <div className="text-sm font-semibold mb-1 truncate">
                {box.title || 'Untitled Location'}
              </div>
              {box.address && (
                <div className="text-xs text-gray-700 mb-1 truncate">
                  {box.address}
                </div>
              )}
              {!isSmallBox && box.description && (
                <div className="text-xs text-gray-700 truncate">
                  {box.description}
                </div>
              )}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
