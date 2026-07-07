import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import PageTransition from '../components/ui/PageTransition'
import { Card, Button, MeetingStatusBadge } from '../components/ui/primitives'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none'
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400'

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
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className={labelClass}>Agenda sections (optional)</label>
        <button
          type="button"
          onClick={addSection}
          className="glow-btn rounded-full border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
        >
          + Add section
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-xs text-slate-500">No sections added yet.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={s.title}
                  onChange={(e) => updateSection(i, 'title', e.target.value)}
                  placeholder="Section title (e.g. Venue Arrangement)"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeSection(i)}
                  className="glow-btn rounded-xl border border-rose-400/40 px-2.5 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-400/10"
                >
                  Remove
                </button>
              </div>
              <textarea
                rows={3}
                value={s.bulletsText}
                onChange={(e) => updateSection(i, 'bulletsText', e.target.value)}
                placeholder={'One bullet point per line, e.g.\nBooking of venue\nSeating arrangement'}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
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
    <div className="min-h-screen bg-navy bg-glow-radial pb-24 md:pb-0">
      <Navbar />
      <PageTransition>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Register</p>
              <h1 className="font-display text-2xl font-bold text-slate-100">Meetings</h1>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'primary'}>
                {showForm ? 'Cancel' : '+ New meeting'}
              </Button>
            )}
          </div>

          {showForm && (
            <Card className="mb-8" glow>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className={labelClass}>Title</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Meeting date</label>
                  <input required type="date" value={form.meeting_date}
                    onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Start time</label>
                  <input required type="time" value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End time</label>
                  <input required type="time" value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Venue</label>
                  <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Purpose of meeting</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
                </div>

                <AgendaSectionBuilder
                  sections={form.agenda_sections}
                  setSections={(sections) => setForm({ ...form, agenda_sections: sections })}
                />

                {formError && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{formError}</p>}

                <Button type="submit" disabled={submitting} className="w-full py-3.5 text-base">
                  {submitting ? 'Creating…' : 'Create meeting'}
                </Button>
              </form>
            </Card>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : meetings.length === 0 ? (
            <p className="text-sm text-slate-400">No meetings yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {meetings.map((m, i) => (
                <Link
                  key={m.id}
                  to={`${basePath}/${m.id}`}
                  className="tap-scale animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                >
                  <Card className="h-full hover:border-accent/40 hover:shadow-glow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-100">{m.title}</p>
                      <MeetingStatusBadge status={m.status} />
                    </div>
                    <p className="mt-2 font-mono text-xs text-accent/80">{formatMeetingWhen(m)}</p>
                    <p className="mt-1 text-xs text-slate-400">{m.venue || 'Venue TBD'}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
