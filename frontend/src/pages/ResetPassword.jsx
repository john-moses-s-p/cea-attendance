import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import client from '../api/client'
import Logos from '../components/ui/Logos'
import { Button } from '../components/ui/primitives'
import PageTransition from '../components/ui/PageTransition'

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
    <div className="flex min-h-screen items-center justify-center bg-navy bg-glow-radial px-4 py-10">
      <PageTransition className="w-full max-w-sm">
        <Logos layout="center" size={48} />
        <div className="glass-card mt-6 rounded-3xl p-6 shadow-glow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold text-slate-100">Set a new password</h2>

          {success ? (
            <p className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
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
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
              />
              {error && (
                <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>
              )}
              <Button type="submit" className="w-full py-3.5 text-base">
                Reset password
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-xs text-accent">
            <Link to="/login" className="hover:underline">Back to sign in</Link>
          </p>
        </div>
      </PageTransition>
    </div>
  )
}
