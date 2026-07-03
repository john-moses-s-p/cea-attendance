import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    <div className="flex min-h-screen">
      {/* Left: blueprint hero */}
      <div className="blueprint-bg hidden flex-1 flex-col justify-between p-12 text-paper lg:flex">
        <div className="font-display text-2xl font-bold tracking-tight">
          CEA <span className="text-blueprint-400">/</span> Civil Engineering Association
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-blueprint-400">
            Drawing No. CEA-2026-01
          </p>
          <h1 className="mt-3 max-w-md font-display text-4xl font-bold leading-tight">
            Meetings, attendance, and member records — built to spec.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-blueprint-100">
            Sign in with your institutional email to reach your association dashboard.
          </p>
        </div>
        <p className="font-mono text-xs text-blueprint-400">
          Scale 1:1 &nbsp;·&nbsp; Rev. A &nbsp;·&nbsp; {new Date().getFullYear()}
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 items-center justify-center bg-paper p-8">
        <div className="w-full max-w-sm">
          <div className="title-block rounded-sm bg-white p-8 shadow-sm">
            <h2 className="font-display text-2xl font-bold text-blueprint-900">Sign in</h2>
            <p className="mt-1 text-sm text-graphite/70">
              Use your institutional email address.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@student.tce.edu"
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none"
                />
              </div>

              {error && (
                <p className="rounded bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-blueprint-700 disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 flex justify-between text-xs text-blueprint-600">
              <a href="/forgot-password" className="hover:underline">Forgot password?</a>
              <a href="/register" className="hover:underline">Create student account</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
