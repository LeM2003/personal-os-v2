"use client"

import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  sub?: string
  action?: ReactNode
  count?: number
}

export default function PageHeader({ title, sub, action, count }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="page-title">
          {title}
          {typeof count === 'number' && count > 0 && (
            <span className="page-title-count">{count}</span>
          )}
        </h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </header>
  )
}
