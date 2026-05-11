"use client"

import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  value: ReactNode
  label: string
  color?: string
  onClick?: () => void
}

export default function StatCard({ icon, value, label, color, onClick }: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}
