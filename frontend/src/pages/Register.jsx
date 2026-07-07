import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import client from '../api/client'
import Logos from '../components/ui/Logos'
import { Button } from '../components/ui/primitives'
import PageTransition from '../components/ui/PageTransition'

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none'
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400'

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
      <div className="flex min-h-screen items-center justify-center bg-navy bg-glow-radial px-4 py-10">
        <PageTransition className="glass-card w-full max-w-sm rounded-3xl p-8 text-center shadow-glow-sm">
          <h2 className="font-display text-xl font-bold text-slate-100">Check your email</h2>
          <p className="mt-2 text-sm text-slate-400">
            We've sent a verification link to <strong className="text-slate-200">{form.email}</strong>. Verify your
            account, then sign in.
          </p>
          <Button onClick={() => navigate(`/verify-email?token=${status.devToken}`)} className="mt-5 w-full">
            Continue to verify (dev mode)
          </Button>
        </PageTransition>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy bg-glow-radial px-4 py-10">
      <PageTransition className="w-full max-w-sm">
        <Logos layout="center" size={48} />
        <div className="glass-card mt-6 rounded-3xl p-6 shadow-glow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold text-slate-100">Create your account</h2>
          <p className="mt-1 text-sm text-slate-400">Students only — use your institutional email.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input required value={form.name} onChange={update('name')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Institutional email</label>
              <input required type="email" value={form.email} onChange={update('email')}
                placeholder="you@student.tce.edu" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Register number</label>
              <input value={form.register_number} onChange={update('register_number')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <input value={form.department} onChange={update('department')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input required type="password" minLength={8} value={form.password} onChange={update('password')} className={inputClass} />
            </div>

            {status.error && (
              <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{status.error}</p>
            )}

            <Button type="submit" disabled={status.loading} className="w-full py-3.5 text-base">
              {status.loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-accent">
            Already have an account? <Link to="/login" className="hover:underline">Sign in</Link>
          </p>
        </div>
      </PageTransition>
    </div>
  )
}
