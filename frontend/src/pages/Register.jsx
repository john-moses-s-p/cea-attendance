import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import client from '../api/client'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', register_number: '', department: '',
  })
  const [status, setStatus] = useState({ loading: false, error: null, devToken: null })

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ loading: true, error: null, devToken: null })
    try {
      const { data } = await client.post('/api/auth/register', form)
      setStatus({ loading: false, error: null, devToken: data.dev_verification_token })
    } catch (err) {
      setStatus({ loading: false, error: err.response?.data?.error || 'Registration failed', devToken: null })
    }
  }

  if (status.devToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-8">
        <div className="title-block max-w-sm rounded-sm bg-white p-8 text-center shadow-sm">
          <h2 className="font-display text-xl font-bold text-blueprint-900">Check your email</h2>
          <p className="mt-2 text-sm text-graphite/70">
            We've sent a verification link to <strong>{form.email}</strong>. Verify your
            account, then sign in.
          </p>
          <button
            onClick={() => navigate(`/verify-email?token=${status.devToken}`)}
            className="mt-5 w-full rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-blueprint-700"
          >
            Continue to verify (dev mode)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-8">
      <div className="w-full max-w-sm">
        <div className="title-block rounded-sm bg-white p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-blueprint-900">Create your account</h2>
          <p className="mt-1 text-sm text-graphite/70">Students only — use your institutional email.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Full name</label>
              <input required value={form.name} onChange={update('name')}
                className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Institutional email</label>
              <input required type="email" value={form.email} onChange={update('email')}
                placeholder="you@student.tce.edu"
                className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Register no.</label>
                <input value={form.register_number} onChange={update('register_number')}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Department</label>
                <input value={form.department} onChange={update('department')}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Password</label>
              <input required type="password" minLength={8} value={form.password} onChange={update('password')}
                className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
            </div>

            {status.error && (
              <p className="rounded bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{status.error}</p>
            )}

            <button type="submit" disabled={status.loading}
              className="w-full rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-blueprint-700 disabled:opacity-60">
              {status.loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-blueprint-600">
            Already have an account? <Link to="/login" className="hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
