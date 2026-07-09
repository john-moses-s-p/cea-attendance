import { useEffect, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import PageTransition from '../components/ui/PageTransition'
import { Card, AttendanceStatusBadge } from '../components/ui/primitives'
import { useAuth } from '../context/AuthContext'

export default function StudentAttendance() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get(`/api/attendance/student/${user.id}`)
      .then(({ data }) => {
        setSummary(data.summary)
        setRecords(data.records)
      })
      .finally(() => setLoading(false))
  }, [user.id])

  return (
    <div className="min-h-screen bg-slate-50 bg-glow-radial pb-24 md:pb-0">
      <Navbar />
      <PageTransition>
        <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">My record</p>
          <h1 className="font-display text-2xl font-bold text-slate-900">Attendance</h1>

          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Loading…</p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Card className="text-center">
                  <p className="font-mono text-2xl font-bold text-accent">
                    {summary?.attendance_percentage ?? '—'}{summary?.attendance_percentage != null && '%'}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">Attendance</p>
                </Card>
                <Card className="text-center">
                  <p className="font-mono text-2xl font-bold text-emerald-600">{summary?.present_or_late ?? 0}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">Attended</p>
                </Card>
                <Card className="text-center">
                  <p className="font-mono text-2xl font-bold text-rose-600">
                    {(summary?.total_meetings ?? 0) - (summary?.present_or_late ?? 0)}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">Missed</p>
                </Card>
              </div>

              <div className="mt-6 space-y-3">
                {records.length === 0 ? (
                  <p className="text-sm text-slate-500">No attendance recorded yet.</p>
                ) : (
                  records.map((r, i) => (
                    <Card key={r.id} className="flex items-center justify-between animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Meeting #{r.meeting_id}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {r.marked_at ? new Date(r.marked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          {' · '}
                          {r.marked_via === 'code' ? 'Self-marked via code' : r.marked_via === 'admin' ? 'Marked by admin' : 'System'}
                        </p>
                      </div>
                      <AttendanceStatusBadge status={r.status} />
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </main>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
