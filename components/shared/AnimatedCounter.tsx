"use client"

import { useEffect, useRef, useState } from 'react'
import { useSpring, useTransform, motion } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export default function AnimatedCounter({
  value,
  duration = 1200,
  prefix,
  suffix,
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const spring = useSpring(0, { duration })
  const display = useTransform(spring, (latest: number) =>
    latest.toLocaleString('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  )
  const [displayText, setDisplayText] = useState('0')
  const ref = useRef(false)

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayText(v))
    return unsubscribe
  }, [display])

  useEffect(() => {
    if (!ref.current) {
      spring.set(0)
      ref.current = true
    }
    void spring.jump(0)
    spring.set(value)
  }, [value, spring])

  return (
    <span className={className}>
      {prefix}
      <motion.span>{displayText}</motion.span>
      {suffix}
    </span>
  )
}
