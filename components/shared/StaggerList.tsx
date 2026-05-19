"use client"

import { type ReactNode, type ReactElement } from 'react'
import { motion } from 'framer-motion'

interface StaggerListProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

const containerVariants = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: { staggerChildren: staggerDelay / 1000 },
  }),
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
}

export default function StaggerList({
  children,
  staggerDelay = 50,
  className = '',
}: StaggerListProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={staggerDelay}
    >
      {Array.isArray(children)
        ? children.map((child: ReactNode, i: number) => (
            <motion.div key={i} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={itemVariants}>{children}</motion.div>
      }
    </motion.div>
  )
}
