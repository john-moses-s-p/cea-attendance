import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import PageTransition from '../components/ui/PageTransition'
import { Card, Button, MeetingStatusBadge } from '../components/ui/primitives'
import Logos from '../components/ui/Logos'
import { useAuth } from '../context/AuthContext'

function formatMeetingWhen(m) {
  if (!m.meeting_date) return '—'
  const dateLabel = new Date(`${m.meeting_date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return `${dateLabel} · ${m.start_time || '—'}–${m.end_time || '—'}`
}

export default function AdminDashboard() {
  const { user } = useAuth()
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
    <div className="min-h-screen bg-navy bg-glow-radial pb-24 md:pb-0">
      <Navbar />
      <PageTransition>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Welcome banner (Requirement 7: logos in welcome section) */}
          <Card className="flex items-center justify-between gap-3" glow>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Overview</p>
              <h1 className="font-display text-xl font-bold text-slate-100 sm:text-2xl">{user.name}</h1>
            </div>
            <Logos layout="welcome" size={36} />
          </Card>

          <div className="mt-4 flex justify-end">
            <Button as={Link} to="/admin/meetings">+ New meeting</Button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              {/* Statistics cards (Requirement 9) */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((s, i) => (
                  <Card key={s.label} className="text-center animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <p className="font-mono text-2xl font-bold text-accent sm:text-3xl">{s.value}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{s.label}</p>
                  </Card>
                ))}
              </div>

              {/* Upcoming meetings card */}
              <Card className="mt-6">
                <h2 className="mb-3 font-display text-lg font-bold text-slate-100">Upcoming meetings</h2>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-slate-400">No meetings scheduled yet. Create one to get started.</p>
                ) : (
                  <div className="space-y-2.5">
                    {upcoming.slice(0, 5).map((m) => (
                      <Link
                        key={m.id}
                        to={`/admin/meetings/${m.id}`}
                        className="tap-scale flex flex-col gap-1 rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-100">{m.title}</p>
                          <p className="text-xs text-slate-400">{m.venue || 'Venue TBD'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs text-accent/80">{formatMeetingWhen(m)}</p>
                          <MeetingStatusBadge status={m.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </main>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
