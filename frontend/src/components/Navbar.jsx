import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) return null

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  const links = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard' },
        { to: '/admin/meetings', label: 'Meetings' },
        { to: '/admin/analytics', label: 'Attendance Analytics' },
      ]
    : [
        { to: '/student', label: 'Dashboard' },
        { to: '/student/meetings', label: 'Meetings' },
      ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="border-b border-blueprint-800 bg-blueprint-900 text-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <div className="flex items-baseline gap-2 font-display">
            <span className="text-lg font-bold tracking-tight">CEA</span>
            <span className="hidden text-xs font-mono uppercase tracking-widest text-blueprint-400 sm:inline">
              Meeting &amp; Member Portal
            </span>
          </div>
          <nav className="flex gap-1">
            {links.map((link) => {
              const active = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blueprint-700 text-paper'
                      : 'text-blueprint-100 hover:bg-blueprint-800'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">{user.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint-400 leading-tight">
              {user.role.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border border-blueprint-600 px-3 py-1.5 text-sm font-medium text-blueprint-100 hover:bg-blueprint-800"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}
