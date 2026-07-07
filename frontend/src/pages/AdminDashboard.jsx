import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'

function formatMeetingWhen(m) {
  if (!m.meeting_date) return '—'
  const dateLabel = new Date(`${m.meeting_date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return `${dateLabel} · ${m.start_time || '—'}–${m.end_time || '—'}`
}

export default function AdminDashboard() {
  const [meetings, setMeetings] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get('/api/meetings'),
      client.get('/api/students'),
    ])
      .then(([meetingsRes, studentsRes]) => {
        setMeetings(meetingsRes.data.meetings)
        setStudents(studentsRes.data.students)
      })
      .finally(() => setLoading(false))
  }, [])

  const upcoming = meetings.filter((m) => m.status === 'scheduled')
  const completed = meetings.filter((m) => m.status === 'completed')
  const activeStudents = students.filter((s) => s.is_active)

  const stats = [
    { label: 'Total students', value: students.length },
    { label: 'Active students', value: activeStudents.length },
    { label: 'Meetings conducted', value: completed.length },
    { label: 'Upcoming meetings', value: upcoming.length },
  ]

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">Overview</p>
            <h1 className="font-display text-2xl font-bold text-blueprint-900">Admin dashboard</h1>
          </div>
          <Link
            to="/admin/meetings"
            className="rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-blueprint-700"
          >
            + New meeting
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-graphite/60">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="title-block rounded-sm bg-white p-3 sm:p-4">
                  <p className="font-mono text-2xl font-semibold text-blueprint-900 sm:text-3xl">{s.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-graphite/60 sm:text-xs">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="mb-3 font-display text-lg font-bold text-blueprint-900">Upcoming meetings</h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-graphite/60">No meetings scheduled yet. Create one to get started.</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(0, 5).map((m) => (
                    <Link
                      key={m.id}
                      to={`/admin/meetings/${m.id}`}
                      className="flex flex-col gap-1 rounded border border-blueprint-400/30 bg-white px-4 py-3.5 hover:border-blueprint-600 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-blueprint-900">{m.title}</p>
                        <p className="text-xs text-graphite/60">{m.venue || 'Venue TBD'}</p>
                      </div>
                      <p className="font-mono text-xs text-blueprint-600">{formatMeetingWhen(m)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
