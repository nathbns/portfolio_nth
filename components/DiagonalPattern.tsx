'use client'

interface DiagonalPatternProps {
  className?: string
}

export default function DiagonalPattern({ className = '' }: DiagonalPatternProps) {
  return (
    <div 
      className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-12 ${className}`}
      style={{ width: '100vw' }}
    >
      <div 
        className="absolute opacity-[0.2]  inset-0 h-12 border-t border-b border-foreground"
        style={{
          width: '100vw',
          backgroundImage: 'repeating-linear-gradient(-90deg, transparent, transparent 1px, currentcolor 2px, currentcolor 2px, transparent 3px, transparent 10px)'
        }}
      />
    </div>
  )
}