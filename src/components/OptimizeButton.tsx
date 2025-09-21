'use client'

import { useState } from 'react'
import Image from 'next/image'

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
        fixed bottom-40 right-13 z-50
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
      <Image
        src="/mquest_battery.png"
        alt="Optimize Route"
        width={24}
        height={24}
      />
    </button>
  )
}
