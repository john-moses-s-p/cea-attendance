import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'

const STATUS_COLOR = {
  present: 'text-signal-present bg-signal-present/10',
  absent: 'text-signal-absent bg-signal-absent/10',
  late: 'text-signal-late bg-signal-late/10',
  excused: 'text-signal-excused bg-signal-excused/10',
}

function formatMeetingWhen(m) {
  if (!m.meeting_date) return m.venue || 'Venue TBD'
  const dateLabel = new Date(`${m.meeting_date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  })
  return `${dateLabel} · ${m.start_time || '—'}–${m.end_time || '—'} · ${m.venue || 'Venue TBD'}`
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
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">Welcome back</p>
        <h1 className="font-display text-2xl font-bold text-blueprint-900">{user.name}</h1>

        {loading ? (
          <p className="mt-6 text-sm text-graphite/60">Loading…</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
              <div className="title-block rounded-sm bg-white p-3 sm:p-4">
                <p className="font-mono text-2xl font-semibold text-blueprint-900 sm:text-3xl">
                  {summary?.attendance_percentage ?? '—'}{summary?.attendance_percentage != null && '%'}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-graphite/60 sm:text-xs">Attendance</p>
              </div>
              <div className="title-block rounded-sm bg-white p-3 sm:p-4">
                <p className="font-mono text-2xl font-semibold text-blueprint-900 sm:text-3xl">{summary?.present_or_late ?? 0}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-graphite/60 sm:text-xs">Attended</p>
              </div>
              <div className="title-block rounded-sm bg-white p-3 sm:p-4">
                <p className="font-mono text-2xl font-semibold text-blueprint-900 sm:text-3xl">
                  {(summary?.total_meetings ?? 0) - (summary?.present_or_late ?? 0)}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-graphite/60 sm:text-xs">Missed</p>
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
                        className="block rounded border border-blueprint-400/30 bg-white px-4 py-3.5 active:bg-blueprint-100/40 sm:hover:border-blueprint-600"
                      >
                        <p className="font-medium text-blueprint-900">{m.title}</p>
                        <p className="font-mono text-xs text-blueprint-600">{formatMeetingWhen(m)}</p>
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
                      <div key={r.id} className="flex items-center justify-between rounded border border-blueprint-400/30 bg-white px-4 py-3.5">
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
      <BottomNav />
    </div>
  )
}
