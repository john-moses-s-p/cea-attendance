import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import PageTransition from '../components/ui/PageTransition'
import { Card, Button, AttendanceStatusBadge } from '../components/ui/primitives'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['present', 'absent', 'late', 'excused']

const STATUS_BTN_ACTIVE = {
  present: 'bg-emerald-400 text-navy shadow-glow-sm',
  absent: 'bg-rose-400 text-navy',
  late: 'bg-amber-400 text-navy',
  excused: 'bg-violet-400 text-navy',
}

async function downloadFile(url, fallbackName) {
  const response = await client.get(url, { responseType: 'blob' })
  const disposition = response.headers['content-disposition'] || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : fallbackName

  const blobUrl = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

function AttendanceCodePanel({ meetingId, locked }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    client.get(`/api/meetings/${meetingId}/code`)
      .then(({ data }) => setInfo(data))
      .catch(() => setError('Could not load attendance code status'))
      .finally(() => setLoading(false))
  }, [meetingId])

  useEffect(load, [load])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const { data } = await client.post(`/api/meetings/${meetingId}/generate-code`)
      setInfo({ attendance_code: data.attendance_code, code_valid: true })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate attendance code')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!info?.attendance_code) return
    navigator.clipboard?.writeText(info.attendance_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (locked) {
    return <p className="text-sm text-slate-400">Attendance is locked for this meeting — the code is no longer active.</p>
  }
  if (loading) return <p className="text-sm text-slate-400">Loading attendance code…</p>

  return (
    <div>
      {error && <p className="mb-3 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}

      {!info?.attendance_code ? (
        <Button onClick={handleGenerate} disabled={generating} className="w-full sm:w-auto">
          {generating ? 'Generating…' : 'Generate attendance code'}
        </Button>
      ) : (
        <div>
          {/* Requirement 6: large 6-digit card */}
          <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 to-transparent p-6 text-center shadow-glow">
            <p className="font-mono text-5xl font-bold tracking-[0.25em] text-accent sm:text-6xl">
              {info.attendance_code}
            </p>
            <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              info.code_valid ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-400/20 text-rose-300'
            }`}>
              {info.code_valid ? '● Active — students can enter this now' : '○ Not currently active'}
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              {copied ? 'Copied!' : 'Copy code'}
            </Button>
            <Button onClick={handleGenerate} disabled={generating} variant="outline" className="flex-1">
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CodeEntryPanel({ onMarked }) {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.trim().length !== 6) {
      setResult({ type: 'error', message: 'Enter the 6-digit code exactly as shown/announced.' })
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      const { data } = await client.post('/api/attendance/code/submit', { code: code.trim() })
      setResult({ type: 'success', message: data.message })
      onMarked?.()
    } catch (err) {
      const message = err.response?.data?.error || 'Could not mark attendance.'
      setResult({ type: err.response?.status === 200 ? 'info' : 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="483921"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center font-mono text-2xl tracking-[0.3em] text-slate-100 placeholder:text-slate-600 focus:border-accent focus:outline-none"
      />
      <Button type="submit" disabled={submitting} className="w-full py-3.5 text-base">
        {submitting ? 'Submitting…' : 'Mark my attendance'}
      </Button>
      {result && (
        <p className={`rounded-2xl px-4 py-3 text-sm ${
          result.type === 'success' ? 'bg-emerald-500/10 text-emerald-300'
          : result.type === 'info' ? 'bg-accent/10 text-accent'
          : 'bg-rose-500/10 text-rose-300'
        }`}>
          {result.message}
        </p>
      )}
    </form>
  )
}

export default function MeetingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  const [meeting, setMeeting] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [exporting, setExporting] = useState(null)

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
      load()
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

  const handleExport = async (kind) => {
    setExporting(kind)
    setExportError(null)
    try {
      if (kind === 'agenda') await downloadFile(`/api/meetings/${id}/agenda-pdf`, `meeting-agenda-${id}.pdf`)
      if (kind === 'excel') await downloadFile(`/api/meetings/${id}/attendance-excel`, `attendance-${id}.xlsx`)
      if (kind === 'pdf') await downloadFile(`/api/meetings/${id}/attendance-pdf`, `attendance-${id}.pdf`)
    } catch {
      setExportError('Could not generate the file. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  if (loading || !meeting) {
    return (
      <div className="min-h-screen bg-navy bg-glow-radial">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-sm text-slate-400">Loading…</p>
        </main>
      </div>
    )
  }

  const backPath = isAdmin ? '/admin/meetings' : '/student/meetings'
  const dateLabel = meeting.meeting_date
    ? new Date(`${meeting.meeting_date}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div className="min-h-screen bg-navy bg-glow-radial pb-24 md:pb-0">
      <Navbar />
      <PageTransition>
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <Link to={backPath} className="text-xs font-mono uppercase tracking-wide text-accent hover:underline">
            ← Back to meetings
          </Link>

          <Card className="mt-4" glow>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-accent">
                  {meeting.status} {meeting.attendance_locked && '· attendance locked'}
                </p>
                <h1 className="mt-1 font-display text-xl font-bold text-slate-100 sm:text-2xl">{meeting.title}</h1>
                <p className="mt-1 font-mono text-sm text-slate-400">
                  {dateLabel} · {meeting.start_time}–{meeting.end_time} · {meeting.venue || 'Venue TBD'}
                </p>
              </div>
              {isAdmin && meeting.status === 'scheduled' && (
                <Button onClick={completeMeeting} variant="outline">Mark completed</Button>
              )}
            </div>

            {meeting.description && <p className="mt-4 text-sm text-slate-300">{meeting.description}</p>}

            {meeting.agenda_sections?.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                <p className="text-xs font-mono uppercase tracking-wide text-accent">Agenda</p>
                {meeting.agenda_sections.map((s) => (
                  <div key={s.id}>
                    <p className="text-sm font-semibold italic text-slate-100">{s.title}</p>
                    {s.bullet_points?.length > 0 && (
                      <ul className="ml-4 list-disc text-sm text-slate-400">
                        {s.bullet_points.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="mt-5 border-t border-white/5 pt-4">
                <p className="mb-2 text-xs font-mono uppercase tracking-wide text-accent">Export</p>
                {exportError && <p className="mb-2 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{exportError}</p>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button onClick={() => handleExport('agenda')} disabled={exporting === 'agenda'} variant="outline">
                    {exporting === 'agenda' ? 'Generating…' : 'Agenda PDF'}
                  </Button>
                  <Button onClick={() => handleExport('excel')} disabled={exporting === 'excel'} variant="outline">
                    {exporting === 'excel' ? 'Generating…' : 'Attendance Excel'}
                  </Button>
                  <Button onClick={() => handleExport('pdf')} disabled={exporting === 'pdf'} variant="outline">
                    {exporting === 'pdf' ? 'Generating…' : 'Attendance PDF'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {isAdmin && meeting.status === 'scheduled' && (
            <Card className="mt-4">
              <h2 className="mb-4 font-display text-lg font-bold text-slate-100">Attendance code</h2>
              <AttendanceCodePanel meetingId={meeting.id} locked={meeting.attendance_locked} />
            </Card>
          )}

          {!isAdmin && meeting.status === 'scheduled' && !meeting.attendance_locked && (
            <Card className="mt-4">
              <h2 className="mb-1 font-display text-lg font-bold text-slate-100">Mark your attendance</h2>
              <p className="mb-4 text-sm text-slate-400">
                Enter the 6-digit code your admin shares during the meeting.
              </p>
              <CodeEntryPanel onMarked={load} />
            </Card>
          )}

          <Card className="mt-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-slate-100">Attendance</h2>
              {isAdmin && !meeting.attendance_locked && (
                <div className="flex gap-2">
                  <Button onClick={markAllPresent} disabled={saving} variant="outline" className="px-3 py-2 text-xs">
                    Mark all present
                  </Button>
                  <Button onClick={lockAttendance} className="px-3 py-2 text-xs">
                    Finalize &amp; lock
                  </Button>
                </div>
              )}
            </div>

            {isAdmin ? (
              students.length === 0 ? (
                <p className="text-sm text-slate-400">No active students found. Add students first.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((s) => {
                    const current = statusFor(s.id)
                    return (
                      <div key={s.id} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-100">{s.name}</p>
                            <p className="font-mono text-xs text-slate-500">{s.register_number || s.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {STATUSES.map((status) => (
                              <button
                                key={status}
                                disabled={meeting.attendance_locked}
                                onClick={() => setStatus(s.id, status)}
                                className={`tap-scale rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:opacity-50 ${
                                  current === status ? STATUS_BTN_ACTIVE[status] : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              <div>
                {attendance.length === 0 ? (
                  <p className="text-sm text-slate-400">Attendance has not been marked for this meeting yet.</p>
                ) : (
                  <AttendanceStatusBadge status={attendance[0].status} />
                )}
              </div>
            )}
          </Card>
        </main>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
