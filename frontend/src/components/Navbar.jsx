import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CeaLogo, TceLogo } from './ui/Logos'

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
        { to: '/admin/analytics', label: 'Attendance' },
      ]
    : [
        { to: '/student', label: 'Dashboard' },
        { to: '/student/meetings', label: 'Meetings' },
        { to: '/student/attendance', label: 'Attendance' },
      ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    // Requirement 3: no top nav on mobile — bottom nav takes over there.
    <header className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white/80 backdrop-blur-lg md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to={isAdmin ? '/admin' : '/student'} className="flex items-center gap-3">
          <CeaLogo size={36} />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">CEA</span>
        </Link>

        <nav className="flex gap-1 rounded-full bg-slate-100 p-1">
          {links.map((link) => {
            const active = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`glow-btn rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-accent text-white shadow-glow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/profile" className="text-right hover:opacity-80">
            <p className="text-sm font-medium leading-tight text-slate-900">{user.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-wide leading-tight text-accent/80">
              {user.role.replace('_', ' ')}
            </p>
          </Link>
          <TceLogo size={36} />
          <button
            onClick={handleLogout}
            className="glow-btn rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}
