'use client'

interface CornerPatternProps {
  side: 'left' | 'right'
  className?: string
  bottomOffset?: string
}

export default function CornerPattern({ side, className = '', bottomOffset = '0' }: CornerPatternProps) {
  // Position starting from container edge, going outward to screen edge
  const positionClass = side === 'right' ? 'left-full' : 'right-full'

  return (
    <div
      className={`absolute ${positionClass} top-0 sm:block hidden ${className}`}
      style={{
        width: '100vw',
        height: bottomOffset !== '0' ? `calc(100% - ${bottomOffset})` : '100%'
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.06] text-foreground"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '6px 6px',
        }}
      />
    </div>
  )
}
