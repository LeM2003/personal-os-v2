"use client"

import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PageTransitionProps {
  children: ReactNode
  tabKey: string
}

export default function PageTransition({ children, tabKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 25,
          mass: 0.8,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
