import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import client from '../api/client'
import Logos from '../components/ui/Logos'
import { Button } from '../components/ui/primitives'
import PageTransition from '../components/ui/PageTransition'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      return
    }
    client
      .post('/api/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy bg-glow-radial px-4 py-10">
      <PageTransition className="w-full max-w-sm">
        <Logos layout="center" size={48} />
        <div className="glass-card mt-6 rounded-3xl p-8 text-center shadow-glow-sm">
          {status === 'verifying' && <p className="text-sm text-slate-400">Verifying your email…</p>}
          {status === 'success' && (
            <>
              <h2 className="font-display text-xl font-bold text-slate-100">Email verified</h2>
              <p className="mt-2 text-sm text-slate-400">You can now sign in to your account.</p>
              <Button as={Link} to="/login" className="mt-5 w-full">
                Go to sign in
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <h2 className="font-display text-xl font-bold text-rose-400">Verification failed</h2>
              <p className="mt-2 text-sm text-slate-400">This link is invalid or has expired.</p>
            </>
          )}
        </div>
      </PageTransition>
    </div>
  )
}
