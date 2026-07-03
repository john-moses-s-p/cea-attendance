import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLE = {
  scheduled: 'text-signal-upcoming bg-signal-upcoming/10',
  completed: 'text-signal-present bg-signal-present/10',
  cancelled: 'text-signal-absent bg-signal-absent/10',
}

export default function Meetings() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  const basePath = isAdmin ? '/admin/meetings' : '/student/meetings'

  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', venue: '', meeting_datetime: '', description: '', agenda: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const loadMeetings = () => {
    setLoading(true)
    client.get('/api/meetings').then((res) => setMeetings(res.data.meetings)).finally(() => setLoading(false))
  }

  useEffect(loadMeetings, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await client.post('/api/meetings', form)
      setShowForm(false)
      setForm({ title: '', venue: '', meeting_datetime: '', description: '', agenda: '' })
      loadMeetings()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create meeting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">Register</p>
            <h1 className="font-display text-2xl font-bold text-blueprint-900">Meetings</h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded bg-blueprint-800 px-4 py-2 text-sm font-semibold text-paper hover:bg-blueprint-700"
            >
              {showForm ? 'Cancel' : '+ New meeting'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="title-block mb-8 rounded-sm bg-white p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Date &amp; time</label>
                <input required type="datetime-local" value={form.meeting_datetime}
                  onChange={(e) => setForm({ ...form, meeting_datetime: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Venue</label>
                <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Agenda</label>
                <textarea rows={2} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
            </div>
            {formError && <p className="mt-3 rounded bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{formError}</p>}
            <button type="submit" disabled={submitting}
              className="mt-4 rounded bg-blueprint-800 px-4 py-2 text-sm font-semibold text-paper hover:bg-blueprint-700 disabled:opacity-60">
              {submitting ? 'Creating…' : 'Create meeting'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-graphite/60">Loading…</p>
        ) : meetings.length === 0 ? (
          <p className="text-sm text-graphite/60">No meetings yet.</p>
        ) : (
          <div className="overflow-hidden rounded-sm border border-blueprint-400/30 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-blueprint-100 text-left font-mono text-xs uppercase tracking-wide text-blueprint-700">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Venue</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.id} className="border-t border-blueprint-400/20 hover:bg-blueprint-100/40">
                    <td className="px-4 py-3">
                      <Link to={`${basePath}/${m.id}`} className="font-medium text-blueprint-900 hover:underline">
                        {m.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite/70">
                      {new Date(m.meeting_datetime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-graphite/70">{m.venue || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[m.status]}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
