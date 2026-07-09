import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Logos from '../components/ui/Logos'
import { Button } from '../components/ui/primitives'
import PageTransition from '../components/ui/PageTransition'

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 bg-glow-radial px-4 py-10">
      <PageTransition className="w-full max-w-sm">
        <Logos layout="center" size={48} />
        <div className="glass-card mt-6 rounded-3xl p-6 shadow-glow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold text-slate-900">Reset your password</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your institutional email and we'll send a reset link.
          </p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                If that account exists, a reset link has been sent.
              </p>
              {devToken && (
                <Button as={Link} to={`/reset-password?token=${devToken}`} className="w-full">
                  Continue to reset (dev mode)
                </Button>
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
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none"
              />
              <Button type="submit" className="w-full py-3.5 text-base">
                Send reset link
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
