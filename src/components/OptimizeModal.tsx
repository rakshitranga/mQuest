'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Box {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  address: string;
}

interface Connection {
  from: string;
  fromSide: "top" | "bottom";
  to: string;
  toSide: "top" | "bottom";
}

interface OptimizeModalProps {
  isOpen: boolean
  onClose: () => void
  boxes: Box[]
  onOptimize: (startBoxId: string, endBoxId: string) => void
}

export default function OptimizeModal({ isOpen, onClose, boxes, onOptimize }: OptimizeModalProps) {
  const [startBoxId, setStartBoxId] = useState('')
  const [endBoxId, setEndBoxId] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)

  if (!isOpen) return null

  const handleOptimize = async () => {
    if (!startBoxId || !endBoxId) {
      alert('Please select both start and end locations')
      return
    }

    if (startBoxId === endBoxId) {
      alert('Start and end locations must be different')
      return
    }

    setIsOptimizing(true)
    try {
      await onOptimize(startBoxId, endBoxId)
      onClose()
    } catch (error) {
      console.error('Optimization failed:', error)
      alert('Failed to optimize route. Please try again.')
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white text-black rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <Image src="/mquest_battery.png" alt="Tim Ize" width={35} height={35} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Tim Ize</h3>
              <p className="text-xs text-gray-500">Let Tim Ize find the best path for you.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {boxes.length < 2 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">You need at least 2 locations on the canvas to optimize a route.</p>
          </div>
        ) : (
          <>
            {/* Start Location */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Location
              </label>
              <select
                value={startBoxId}
                onChange={(e) => setStartBoxId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select start location...</option>
                {boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.title || 'Untitled Location'} {box.address && `(${box.address})`}
                  </option>
                ))}
              </select>
            </div>

            {/* End Location */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Location
              </label>
              <select
                value={endBoxId}
                onChange={(e) => setEndBoxId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select end location...</option>
                {boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.title || 'Untitled Location'} {box.address && `(${box.address})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !startBoxId || !endBoxId}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isOptimizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Optimizing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Optimize Route
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
