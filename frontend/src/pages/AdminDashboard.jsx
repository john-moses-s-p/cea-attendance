import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'

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
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">Overview</p>
            <h1 className="font-display text-2xl font-bold text-blueprint-900">Admin dashboard</h1>
          </div>
          <Link
            to="/admin/meetings"
            className="rounded bg-blueprint-800 px-4 py-2 text-sm font-semibold text-paper hover:bg-blueprint-700"
          >
            + New meeting
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-graphite/60">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="title-block rounded-sm bg-white p-4">
                  <p className="font-mono text-3xl font-semibold text-blueprint-900">{s.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-graphite/60">{s.label}</p>
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
                      className="flex items-center justify-between rounded border border-blueprint-400/30 bg-white px-4 py-3 hover:border-blueprint-600"
                    >
                      <div>
                        <p className="font-medium text-blueprint-900">{m.title}</p>
                        <p className="text-xs text-graphite/60">{m.venue || 'Venue TBD'}</p>
                      </div>
                      <p className="font-mono text-xs text-blueprint-600">
                        {new Date(m.meeting_datetime).toLocaleString()}
                      </p>
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
