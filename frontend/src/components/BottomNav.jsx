import { Link, useLocation } from 'react-router-dom'

const ICONS = {
  home: (
    <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  ),
  meetings: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  code: (
    <>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M4 7l8-4 8 4" />
    </>
  ),
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {ICONS[name]}
    </svg>
  )
}

/**
 * Mobile-only bottom navigation bar for students (Feature 5). Hidden at the
 * md breakpoint and above, where the top Navbar's links are already visible.
 * Rendered by student-facing pages alongside <Navbar />.
 */
export default function BottomNav() {
  const location = useLocation()

  const items = [
    { to: '/student', label: 'Dashboard', icon: 'home' },
    { to: '/student/meetings', label: 'Meetings', icon: 'meetings' },
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-blueprint-800 bg-blueprint-900 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-6xl">
        {items.map((item) => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-paper' : 'text-blueprint-400'
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
