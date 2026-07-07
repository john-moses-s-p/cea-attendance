import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import PageTransition from '../components/ui/PageTransition'
import { Card, MeetingStatusBadge, AttendanceStatusBadge } from '../components/ui/primitives'
import Logos from '../components/ui/Logos'
import { useAuth } from '../context/AuthContext'

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
    <div className="min-h-screen bg-navy bg-glow-radial pb-24 md:pb-0">
      <Navbar />
      <PageTransition>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Welcome banner (Requirement 7: logos in welcome section) */}
          <Card className="flex items-center justify-between" glow>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Welcome back</p>
              <h1 className="font-display text-xl font-bold text-slate-100 sm:text-2xl">{user.name}</h1>
            </div>
            <Logos layout="welcome" size={36} />
          </Card>

          {loading ? (
            <p className="mt-6 text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              {/* Statistics cards (Requirement 9) */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Card className="text-center animate-fade-in-up">
                  <p className="font-mono text-2xl font-bold text-accent sm:text-3xl">
                    {summary?.attendance_percentage ?? '—'}{summary?.attendance_percentage != null && '%'}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">Attendance</p>
                </Card>
                <Card className="text-center animate-fade-in-up" style={{ animationDelay: '40ms' }}>
                  <p className="font-mono text-2xl font-bold text-emerald-300 sm:text-3xl">{summary?.present_or_late ?? 0}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">Attended</p>
                </Card>
                <Card className="text-center animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                  <p className="font-mono text-2xl font-bold text-rose-300 sm:text-3xl">
                    {(summary?.total_meetings ?? 0) - (summary?.present_or_late ?? 0)}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">Missed</p>
                </Card>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {/* Upcoming meetings card */}
                <Card>
                  <h2 className="mb-3 font-display text-lg font-bold text-slate-100">Upcoming meetings</h2>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-slate-400">Nothing scheduled right now.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {upcoming.map((m) => (
                        <Link
                          key={m.id}
                          to={`/student/meetings/${m.id}`}
                          className="tap-scale flex items-start justify-between gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 hover:border-accent/40"
                        >
                          <div>
                            <p className="font-medium text-slate-100">{m.title}</p>
                            <p className="mt-0.5 font-mono text-xs text-accent/80">{formatMeetingWhen(m)}</p>
                          </div>
                          <MeetingStatusBadge status={m.status} />
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Attendance summary card */}
                <Card>
                  <h2 className="mb-3 font-display text-lg font-bold text-slate-100">Recent attendance</h2>
                  {records.length === 0 ? (
                    <p className="text-sm text-slate-400">No attendance recorded yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {records.map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5">
                          <p className="text-sm text-slate-100">Meeting #{r.meeting_id}</p>
                          <AttendanceStatusBadge status={r.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </main>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
