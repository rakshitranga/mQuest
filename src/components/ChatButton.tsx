'use client'

import { useState } from 'react'

interface ChatButtonProps {
  onClick: () => void
  hasUnread?: boolean
}

export default function ChatButton({ onClick, hasUnread = false }: ChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bg-white bottom-12 right-10 z-40 w-20 h-20 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
    >
      {/* Notification badge */}
      {hasUnread && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
      )}
      
      {/* Search/Chat Icon */}
      <img src="/mquest_search.png" className="h-12 w-12" />
      
      {/* Tooltip */}
      <div className={`absolute bottom-16 right-0 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap transition-all duration-200 ${
        isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}>
        Talk to M.Q.
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </button>
  )
}
