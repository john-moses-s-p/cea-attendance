import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

const STATUS_COLOR = {
  present: 'text-signal-present bg-signal-present/10',
  absent: 'text-signal-absent bg-signal-absent/10',
  late: 'text-signal-late bg-signal-late/10',
  excused: 'text-signal-excused bg-signal-excused/10',
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get(`/api/attendance/student/${user.id}`),
      client.get('/api/meetings?status=scheduled'),
    ])
      .then(([attendanceRes, meetingsRes]) => {
        setSummary(attendanceRes.data.summary)
        setRecords(attendanceRes.data.records.slice(0, 5))
        setUpcoming(meetingsRes.data.meetings.slice(0, 4))
      })
      .finally(() => setLoading(false))
  }, [user.id])

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">Welcome back</p>
        <h1 className="font-display text-2xl font-bold text-blueprint-900">{user.name}</h1>

        {loading ? (
          <p className="mt-6 text-sm text-graphite/60">Loading…</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="title-block rounded-sm bg-white p-4">
                <p className="font-mono text-3xl font-semibold text-blueprint-900">
                  {summary?.attendance_percentage ?? '—'}{summary?.attendance_percentage != null && '%'}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-graphite/60">Attendance</p>
              </div>
              <div className="title-block rounded-sm bg-white p-4">
                <p className="font-mono text-3xl font-semibold text-blueprint-900">{summary?.present_or_late ?? 0}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-graphite/60">Meetings attended</p>
              </div>
              <div className="title-block rounded-sm bg-white p-4">
                <p className="font-mono text-3xl font-semibold text-blueprint-900">
                  {(summary?.total_meetings ?? 0) - (summary?.present_or_late ?? 0)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-graphite/60">Meetings missed</p>
              </div>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="mb-3 font-display text-lg font-bold text-blueprint-900">Upcoming meetings</h2>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-graphite/60">Nothing scheduled right now.</p>
                ) : (
                  <div className="space-y-2">
                    {upcoming.map((m) => (
                      <Link
                        key={m.id}
                        to={`/student/meetings/${m.id}`}
                        className="block rounded border border-blueprint-400/30 bg-white px-4 py-3 hover:border-blueprint-600"
                      >
                        <p className="font-medium text-blueprint-900">{m.title}</p>
                        <p className="font-mono text-xs text-blueprint-600">
                          {new Date(m.meeting_datetime).toLocaleString()} · {m.venue || 'Venue TBD'}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-3 font-display text-lg font-bold text-blueprint-900">Recent attendance</h2>
                {records.length === 0 ? (
                  <p className="text-sm text-graphite/60">No attendance recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {records.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded border border-blueprint-400/30 bg-white px-4 py-3">
                        <p className="text-sm text-blueprint-900">Meeting #{r.meeting_id}</p>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[r.status]}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
