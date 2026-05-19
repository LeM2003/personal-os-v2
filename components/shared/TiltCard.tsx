"use client"

import { useRef, useState, useCallback, type ReactNode, type CSSProperties } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'

interface TiltCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  glareEnabled?: boolean
  maxTilt?: number
  scale?: number
}

export default function TiltCard({
  children,
  className = '',
  style,
  glareEnabled = true,
  maxTilt = 15,
  scale = 1.02,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = useState(false)

  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]), { stiffness: 300, damping: 30 })
  const springScale = useSpring(hovering ? scale : 1, { stiffness: 300, damping: 25 })

  const glareX = useTransform(mouseX, [0, 1], [-50, 50])
  const glareY = useTransform(mouseY, [0, 1], [-50, 50])
  const glareOpacity = useSpring(hovering ? 0.15 : 0, { stiffness: 200, damping: 20 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }, [mouseX, mouseY])

  const handleMouseEnter = useCallback(() => setHovering(true), [])
  const handleMouseLeave = useCallback(() => {
    setHovering(false)
    mouseX.set(0.5)
    mouseY.set(0.5)
  }, [mouseX, mouseY])

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        perspective: 800,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          rotateX,
          rotateY,
          scale: springScale,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'inherit',
        }}
      >
        {children}

        {glareEnabled && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              borderRadius: 'inherit',
              background: `radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.25), transparent 60%)`,
              opacity: glareOpacity,
              x: glareX,
              y: glareY,
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </motion.div>
    </motion.div>
  )
}
