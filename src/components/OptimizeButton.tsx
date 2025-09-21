'use client'

import { useState } from 'react'

interface OptimizeButtonProps {
  onClick: () => void
}

export default function OptimizeButton({ onClick }: OptimizeButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-6 right-24 z-50
        w-14 h-14 rounded-full shadow-lg
        flex items-center justify-center
        transition-all duration-300 ease-in-out
        ${isHovered 
          ? 'bg-green-600 scale-110 shadow-xl' 
          : 'bg-green-500 hover:bg-green-600'
        }
      `}
      title="Optimize Route"
    >
      <svg 
        className="w-6 h-6 text-white" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M13 10V3L4 14h7v7l9-11h-7z" 
        />
      </svg>
    </button>
  )
}
