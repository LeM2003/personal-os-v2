"use client"

/**
 * PageHeader — large title style iOS
 *
 * @param {string}  title    — titre principal (gras, large)
 * @param {string=} sub      — sous-titre optionnel (muted)
 * @param {ReactNode=} action — bouton ou composant à droite
 * @param {number=} count    — compteur à afficher à côté du titre (ex. "Tâches 12")
 */
export default function PageHeader({ title, sub, action, count }) {
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
