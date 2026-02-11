import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: 'Home', icon: '⚡' },
  { path: '/program-select', label: 'Programs', icon: '📋' },
  { path: '/library', label: 'Library', icon: '📖' },
  { path: '/history', label: 'History', icon: '📊' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  if (location.pathname.startsWith('/workout/')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-primary/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[480px] items-center justify-around">
        {tabs.map(tab => {
          const active = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-accent-red' : 'text-text-muted'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-[var(--font-display)] text-[10px] font-semibold uppercase tracking-wider">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
