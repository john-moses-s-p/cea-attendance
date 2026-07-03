import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import client from '../api/client'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await client.post('/api/auth/reset-password', { token, new_password: password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-8">
      <div className="title-block w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <h2 className="font-display text-2xl font-bold text-blueprint-900">Set a new password</h2>

        {success ? (
          <p className="mt-4 rounded bg-signal-present/10 px-3 py-2 text-sm text-signal-present">
            Password reset. Redirecting to sign in…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none"
            />
            {error && (
              <p className="rounded bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{error}</p>
            )}
            <button
              type="submit"
              className="w-full rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-blueprint-700"
            >
              Reset password
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
