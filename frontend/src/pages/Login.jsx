import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logos from '../components/ui/Logos'
import { Button } from '../components/ui/primitives'
import PageTransition from '../components/ui/PageTransition'

export default function Login() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result.success) {
      navigate(result.user.role === 'student' ? '/student' : '/admin')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy bg-glow-radial px-4 py-10">
      <PageTransition className="w-full max-w-sm">
        <div className="mb-8">
          <Logos layout="center" size={64} />
          <h1 className="mt-5 text-center font-display text-xl font-bold text-slate-100">
            Civil Engineering Association
          </h1>
          <p className="mt-1 text-center text-sm text-slate-400">
            Sign in with your institutional email
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-glow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@student.tce.edu"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-100 focus:border-accent focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full py-3.5 text-base">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 flex justify-between text-xs text-accent">
            <a href="/forgot-password" className="hover:underline">Forgot password?</a>
            <a href="/register" className="hover:underline">Create student account</a>
          </div>
        </div>
      </PageTransition>
    </div>
  )
}
