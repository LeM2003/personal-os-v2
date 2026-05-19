"use client"

import { type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface GlowButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  glowColor?: string
  className?: string
  style?: CSSProperties
  disabled?: boolean
  children?: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
    color: '#fff',
    border: 'none',
    boxShadow: 'var(--glow-cyan)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--accent-1)',
    border: '1px solid var(--ghost-border)',
    backdropFilter: 'blur(4px)',
  },
  danger: {
    background: 'rgba(239, 68, 68, 0.08)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
}

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: '12px', borderRadius: '8px' },
  md: { padding: '9px 20px', fontSize: '14px', borderRadius: '10px' },
  lg: { padding: '13px 28px', fontSize: '16px', borderRadius: '12px' },
}

const glowColors: Record<ButtonVariant, string> = {
  primary: 'rgba(56, 189, 248, 0.4)',
  secondary: 'rgba(56, 189, 248, 0.2)',
  danger: 'rgba(239, 68, 68, 0.35)',
}

export default function GlowButton({
  variant = 'primary',
  size = 'md',
  glowColor,
  className = '',
  style,
  disabled,
  children,
  ...rest
}: GlowButtonProps) {
  const resolvedGlow = glowColor || glowColors[variant]

  return (
    <motion.button
      className={className}
      disabled={disabled}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        whiteSpace: 'nowrap' as const,
        outline: 'none',
        lineHeight: 1.4,
      }}
      {...rest}
    >
      {children}

      <motion.div
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: 'inherit',
          border: `2px solid ${resolvedGlow}`,
          pointerEvents: 'none',
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: disabled ? 0 : 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        aria-hidden
      />

      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          boxShadow: `0 0 18px ${resolvedGlow}, 0 0 40px ${resolvedGlow}`,
          opacity: 0,
          transition: 'opacity 0.3s ease',
        }}
        aria-hidden
      />

      <style>{`
        button:hover > span:last-of-type:not([aria-hidden]) {
          opacity: 1;
        }
      `}</style>
    </motion.button>
  )
}
