import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import PageTransition from '../components/ui/PageTransition'
import { Card, Button } from '../components/ui/primitives'
import { CeaLogo, TceLogo } from '../components/ui/Logos'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  const fields = [
    { label: 'Full name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role.replace('_', ' ') },
    ...(user.register_number ? [{ label: 'Register number', value: user.register_number }] : []),
    ...(user.department ? [{ label: 'Department', value: user.department }] : []),
  ]

  return (
    <div className="min-h-screen bg-navy bg-glow-radial pb-24 md:pb-0">
      <Navbar />
      <PageTransition>
        <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Account</p>
          <h1 className="font-display text-2xl font-bold text-slate-100">Profile</h1>

          <Card className="mt-6 flex flex-col items-center gap-4 text-center" glow>
            <div className="flex items-center gap-3">
              <CeaLogo size={56} />
              <TceLogo size={56} />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-100">{user.name}</p>
              <p className="font-mono text-xs uppercase tracking-wide text-accent">{user.role.replace('_', ' ')}</p>
            </div>
          </Card>

          <Card className="mt-4 animate-fade-in-up">
            <dl className="divide-y divide-white/5">
              {fields.map((f) => (
                <div key={f.label} className="flex items-center justify-between py-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">{f.label}</dt>
                  <dd className="text-sm font-medium text-slate-100">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {isAdmin && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Signed in with elevated ({user.role.replace('_', ' ')}) access.
            </p>
          )}

          <Button variant="danger" onClick={handleLogout} className="mt-6 w-full">
            Log out
          </Button>
        </main>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
