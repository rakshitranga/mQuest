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
      className={`
        fixed bottom-10 left-12 z-50
        w-20 h-20 rounded-full shadow-lg
        flex items-center justify-center
        transition-all duration-300 ease-in-out bg-white
      `}
      title="Optimize Route"
    >
      <Image
        src="/mquest_battery.png"
        alt="Optimize Route"
        width={50}
        height={50}
      />
    </button>
  )
}
