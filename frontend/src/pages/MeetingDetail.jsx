import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import QRCodeGenerator from '../components/QRCodeGenerator'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['present', 'absent', 'late', 'excused']

const STATUS_STYLE = {
  present: 'bg-signal-present text-white',
  absent: 'bg-signal-absent text-white',
  late: 'bg-signal-late text-white',
  excused: 'bg-signal-excused text-white',
}

export default function MeetingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  const [meeting, setMeeting] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState([]) // admin: roster records; student: single record
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const requests = [
      client.get(`/api/meetings/${id}`),
      client.get(`/api/attendance/meeting/${id}`),
    ]
    if (isAdmin) requests.push(client.get('/api/students?active_only=true'))

    Promise.all(requests).then(([meetingRes, attendanceRes, studentsRes]) => {
      setMeeting(meetingRes.data.meeting)
      setAttendance(
        isAdmin ? attendanceRes.data.attendance : attendanceRes.data.attendance ? [attendanceRes.data.attendance] : []
      )
      if (studentsRes) setStudents(studentsRes.data.students)
    }).finally(() => setLoading(false))
  }, [id, isAdmin])

  useEffect(load, [load])

  const statusFor = (studentId) => attendance.find((a) => a.student_id === studentId)?.status

  const setStatus = async (studentId, status) => {
    setAttendance((prev) => {
      const exists = prev.some((a) => a.student_id === studentId)
      return exists
        ? prev.map((a) => (a.student_id === studentId ? { ...a, status } : a))
        : [...prev, { student_id: studentId, status }]
    })
    try {
      await client.post(`/api/attendance/meeting/${id}/mark`, { student_id: studentId, status })
    } catch {
      load() // revert to server state on failure
    }
  }

  const markAllPresent = async () => {
    setSaving(true)
    const records = students.map((s) => ({ student_id: s.id, status: 'present' }))
    try {
      await client.post(`/api/attendance/meeting/${id}/bulk`, { records })
      load()
    } finally {
      setSaving(false)
    }
  }

  const lockAttendance = async () => {
    if (!window.confirm('Lock attendance for this meeting? This cannot be undone from the UI.')) return
    await client.post(`/api/attendance/meeting/${id}/lock`)
    load()
  }

  const completeMeeting = async () => {
    await client.post(`/api/meetings/${id}/complete`, {})
    load()
  }

  if (loading || !meeting) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-sm text-graphite/60">Loading…</p>
        </main>
      </div>
    )
  }

  const backPath = isAdmin ? '/admin/meetings' : '/student/meetings'

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link to={backPath} className="text-xs font-mono uppercase tracking-wide text-blueprint-600 hover:underline">
          ← Back to meetings
        </Link>

        <div className="title-block mt-4 rounded-sm bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">
                {meeting.status} {meeting.attendance_locked && '· attendance locked'}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-blueprint-900">{meeting.title}</h1>
              <p className="mt-1 font-mono text-sm text-graphite/70">
                {new Date(meeting.meeting_datetime).toLocaleString()} · {meeting.venue || 'Venue TBD'}
              </p>
            </div>
            {isAdmin && meeting.status === 'scheduled' && (
              <button onClick={completeMeeting} className="rounded border border-blueprint-600 px-3 py-1.5 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100">
                Mark completed
              </button>
            )}
          </div>

          {meeting.description && <p className="mt-4 text-sm text-graphite/80">{meeting.description}</p>}
          {meeting.agenda && (
            <div className="mt-4">
              <p className="text-xs font-mono uppercase tracking-wide text-blueprint-600">Agenda</p>
              <p className="mt-1 whitespace-pre-line text-sm text-graphite/80">{meeting.agenda}</p>
            </div>
          )}
        </div>

        {/* Attendance section */}
        <div className="title-block mt-6 rounded-sm bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-blueprint-900">Attendance</h2>
            {isAdmin && !meeting.attendance_locked && (
              <div className="flex gap-2">
                <button onClick={markAllPresent} disabled={saving}
                  className="rounded border border-blueprint-600 px-3 py-1.5 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100 disabled:opacity-60">
                  Mark all present
                </button>
                <button onClick={lockAttendance}
                  className="rounded bg-blueprint-800 px-3 py-1.5 text-xs font-semibold text-paper hover:bg-blueprint-700">
                  Finalize &amp; lock
                </button>
              </div>
            )}
          </div>

          {isAdmin ? (
            students.length === 0 ? (
              <p className="text-sm text-graphite/60">No active students found. Add students first.</p>
            ) : (
              <div className="divide-y divide-blueprint-400/20">
                {students.map((s) => {
                  const current = statusFor(s.id)
                  return (
                    <div key={s.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-blueprint-900">{s.name}</p>
                        <p className="font-mono text-xs text-graphite/50">{s.register_number || s.email}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {STATUSES.map((status) => (
                          <button
                            key={status}
                            disabled={meeting.attendance_locked}
                            onClick={() => setStatus(s.id, status)}
                            className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-50 ${
                              current === status ? STATUS_STYLE[status] : 'bg-blueprint-100 text-graphite/60 hover:bg-blueprint-400/20'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <div>
              {attendance.length === 0 ? (
                <p className="text-sm text-graphite/60">Attendance has not been marked for this meeting yet.</p>
              ) : (
                <span className={`rounded px-3 py-1 text-sm font-medium capitalize ${STATUS_STYLE[attendance[0].status]}`}>
                  {attendance[0].status}
                </span>
              )}
            </div>
          )}
        </div>
        {/* QR attendance */}
        {isAdmin && meeting.status === 'scheduled' && (
          <div className="title-block mt-6 rounded-sm bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-blueprint-900">QR check-in</h2>
            <QRCodeGenerator
              meetingId={meeting.id}
              locked={meeting.attendance_locked}
              onScanRecorded={load}
            />
          </div>
        )}

        {!isAdmin && meeting.status === 'scheduled' && !meeting.attendance_locked && (
          <div className="title-block mt-6 rounded-sm bg-white p-6 text-center">
            <p className="mb-3 text-sm text-graphite/70">
              If your admin has shown a QR code for this meeting, scan it to mark yourself present.
            </p>
            <Link
              to="/student/scan"
              className="inline-block rounded bg-blueprint-800 px-4 py-2 text-sm font-semibold text-paper hover:bg-blueprint-700"
            >
              Scan attendance
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
