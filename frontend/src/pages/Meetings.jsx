import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLE = {
  scheduled: 'text-signal-upcoming bg-signal-upcoming/10',
  completed: 'text-signal-present bg-signal-present/10',
  cancelled: 'text-signal-absent bg-signal-absent/10',
}

const EMPTY_FORM = {
  title: '',
  venue: '',
  meeting_date: '',
  start_time: '',
  end_time: '',
  description: '',
  agenda_sections: [],
}

function formatMeetingWhen(m) {
  if (!m.meeting_date) return '—'
  const dateLabel = new Date(`${m.meeting_date}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
  return `${dateLabel} · ${m.start_time || '—'}–${m.end_time || '—'}`
}

function AgendaSectionBuilder({ sections, setSections }) {
  const addSection = () => setSections([...sections, { title: '', bulletsText: '' }])
  const removeSection = (i) => setSections(sections.filter((_, idx) => idx !== i))
  const updateSection = (i, field, value) =>
    setSections(sections.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-xs font-mono uppercase tracking-wide text-blueprint-600">
          Agenda sections (optional — used to build the agenda PDF)
        </label>
        <button
          type="button"
          onClick={addSection}
          className="rounded border border-blueprint-600 px-2.5 py-1 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100"
        >
          + Add section
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-xs text-graphite/50">No sections added yet.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <div key={i} className="rounded border border-blueprint-400/30 bg-blueprint-100/20 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={s.title}
                  onChange={(e) => updateSection(i, 'title', e.target.value)}
                  placeholder="Section title (e.g. Venue Arrangement)"
                  className="flex-1 rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeSection(i)}
                  className="rounded border border-signal-absent px-2 py-2 text-xs font-semibold text-signal-absent hover:bg-signal-absent/10"
                >
                  Remove
                </button>
              </div>
              <textarea
                rows={3}
                value={s.bulletsText}
                onChange={(e) => updateSection(i, 'bulletsText', e.target.value)}
                placeholder={'One bullet point per line, e.g.\nBooking of venue\nSeating arrangement'}
                className="w-full rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Meetings() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  const basePath = isAdmin ? '/admin/meetings' : '/student/meetings'

  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
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
      const payload = {
        ...form,
        agenda_sections: form.agenda_sections
          .filter((s) => s.title.trim())
          .map((s) => ({
            title: s.title.trim(),
            bullet_points: s.bulletsText.split('\n').map((b) => b.trim()).filter(Boolean),
          })),
      }
      await client.post('/api/meetings', payload)
      setShowForm(false)
      setForm(EMPTY_FORM)
      loadMeetings()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create meeting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">Register</p>
            <h1 className="font-display text-2xl font-bold text-blueprint-900">Meetings</h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-blueprint-700"
            >
              {showForm ? 'Cancel' : '+ New meeting'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="title-block mb-8 rounded-sm bg-white p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2.5 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Meeting date</label>
                <input required type="date" value={form.meeting_date}
                  onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2.5 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Venue</label>
                <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2.5 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Start time</label>
                <input required type="time" value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2.5 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">End time</label>
                <input required type="time" value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2.5 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Purpose of meeting</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded border border-blueprint-400/40 px-3 py-2.5 text-sm focus:border-blueprint-600 focus:outline-none" />
              </div>
              <AgendaSectionBuilder
                sections={form.agenda_sections}
                setSections={(sections) => setForm({ ...form, agenda_sections: sections })}
              />
            </div>
            {formError && <p className="mt-3 rounded bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{formError}</p>}
            <button type="submit" disabled={submitting}
              className="mt-4 w-full rounded bg-blueprint-800 px-4 py-3 text-sm font-semibold text-paper hover:bg-blueprint-700 disabled:opacity-60 sm:w-auto sm:py-2">
              {submitting ? 'Creating…' : 'Create meeting'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-graphite/60">Loading…</p>
        ) : meetings.length === 0 ? (
          <p className="text-sm text-graphite/60">No meetings yet.</p>
        ) : (
          <>
            {/* Mobile: card list, no horizontal scrolling */}
            <div className="space-y-3 sm:hidden">
              {meetings.map((m) => (
                <Link
                  key={m.id}
                  to={`${basePath}/${m.id}`}
                  className="block rounded-sm border border-blueprint-400/30 bg-white p-4 active:bg-blueprint-100/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-blueprint-900">{m.title}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[m.status]}`}>
                      {m.status}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-graphite/70">{formatMeetingWhen(m)}</p>
                  <p className="mt-0.5 text-xs text-graphite/60">{m.venue || 'Venue TBD'}</p>
                </Link>
              ))}
            </div>

            {/* Desktop/tablet: table */}
            <div className="hidden overflow-hidden rounded-sm border border-blueprint-400/30 bg-white sm:block">
              <table className="w-full text-sm">
                <thead className="bg-blueprint-100 text-left font-mono text-xs uppercase tracking-wide text-blueprint-700">
                  <tr>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Date &amp; time</th>
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
                      <td className="px-4 py-3 font-mono text-xs text-graphite/70">{formatMeetingWhen(m)}</td>
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
          </>
        )}
      </main>
      {!isAdmin && <BottomNav />}
    </div>
  )
}
