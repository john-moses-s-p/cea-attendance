import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import client from '../api/client'

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
    <div className="flex min-h-screen items-center justify-center bg-paper p-8">
      <div className="title-block max-w-sm rounded-sm bg-white p-8 text-center shadow-sm">
        {status === 'verifying' && <p className="text-sm text-graphite/70">Verifying your email…</p>}
        {status === 'success' && (
          <>
            <h2 className="font-display text-xl font-bold text-blueprint-900">Email verified</h2>
            <p className="mt-2 text-sm text-graphite/70">You can now sign in to your account.</p>
            <Link to="/login" className="mt-5 inline-block w-full rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-blueprint-700">
              Go to sign in
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 className="font-display text-xl font-bold text-signal-absent">Verification failed</h2>
            <p className="mt-2 text-sm text-graphite/70">This link is invalid or has expired.</p>
          </>
        )}
      </div>
    </div>
  )
}
