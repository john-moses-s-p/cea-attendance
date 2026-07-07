import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ICONS = {
  home: <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />,
  meetings: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  attendance: (
    <>
      <path d="M9 12.5 11 14.5 15 10" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
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
 * Mobile-only bottom navigation (Requirement 3). Replaces the top Navbar
 * below the md breakpoint, for both admins and students — each role's
 * "Attendance" tab points at the view that's relevant to them.
 */
export default function BottomNav() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return null

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  const items = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', icon: 'home' },
        { to: '/admin/meetings', label: 'Meetings', icon: 'meetings' },
        { to: '/admin/analytics', label: 'Attendance', icon: 'attendance' },
        { to: '/profile', label: 'Profile', icon: 'profile' },
      ]
    : [
        { to: '/student', label: 'Dashboard', icon: 'home' },
        { to: '/student/meetings', label: 'Meetings', icon: 'meetings' },
        { to: '/student/attendance', label: 'Attendance', icon: 'attendance' },
        { to: '/profile', label: 'Profile', icon: 'profile' },
      ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-6xl">
        {items.map((item) => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className="tap-scale flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                active ? 'bg-accent/20 text-accent shadow-glow-sm' : 'text-slate-400'
              }`}>
                <Icon name={item.icon} />
              </span>
              <span className={active ? 'text-accent' : 'text-slate-400'}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
