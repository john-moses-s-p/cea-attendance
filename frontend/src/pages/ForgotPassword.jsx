import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data } = await client.post('/api/auth/forgot-password', { email })
    setSent(true)
    setDevToken(data.dev_reset_token || null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-8">
      <div className="title-block w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <h2 className="font-display text-2xl font-bold text-blueprint-900">Reset your password</h2>
        <p className="mt-1 text-sm text-graphite/70">
          Enter your institutional email and we'll send a reset link.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded bg-signal-present/10 px-3 py-2 text-sm text-signal-present">
              If that account exists, a reset link has been sent.
            </p>
            {devToken && (
              <Link
                to={`/reset-password?token=${devToken}`}
                className="block w-full rounded bg-blueprint-800 px-4 py-2.5 text-center text-sm font-semibold text-paper hover:bg-blueprint-700"
              >
                Continue to reset (dev mode)
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.tce.edu"
              className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-blueprint-700"
            >
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-blueprint-600">
          <Link to="/login" className="hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
