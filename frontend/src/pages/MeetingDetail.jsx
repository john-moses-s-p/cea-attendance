import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['present', 'absent', 'late', 'excused']

const STATUS_STYLE = {
  present: 'bg-signal-present text-white',
  absent: 'bg-signal-absent text-white',
  late: 'bg-signal-late text-white',
  excused: 'bg-signal-excused text-white',
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
    return <p className="text-sm text-graphite/60">Attendance is locked for this meeting — the code is no longer active.</p>
  }
  if (loading) return <p className="text-sm text-graphite/60">Loading attendance code…</p>

  return (
    <div>
      {error && <p className="mb-3 rounded bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{error}</p>}

      {!info?.attendance_code ? (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded bg-blueprint-800 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-blueprint-700 disabled:opacity-60"
        >
          {generating ? 'Generating…' : 'Generate attendance code'}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="font-mono text-4xl font-bold tracking-widest text-blueprint-900">{info.attendance_code}</p>
            <p className={`mt-1 text-xs font-medium ${info.code_valid ? 'text-signal-present' : 'text-signal-absent'}`}>
              {info.code_valid ? 'Active — students can enter this code now' : 'Not currently active (outside meeting time window)'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="rounded border border-blueprint-600 px-3 py-2 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100"
            >
              {copied ? 'Copied!' : 'Copy code'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded border border-blueprint-600 px-3 py-2 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100 disabled:opacity-60"
            >
              Regenerate
            </button>
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">Attendance code</label>
        <input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="e.g. 483921"
          className="w-full rounded border border-blueprint-400/40 px-3 py-3 text-center font-mono text-lg tracking-widest focus:border-blueprint-600 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blueprint-800 px-4 py-3 text-sm font-semibold text-paper hover:bg-blueprint-700 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Mark my attendance'}
      </button>
      {result && (
        <p className={`w-full rounded px-3 py-2 text-sm sm:w-auto ${
          result.type === 'success' ? 'bg-signal-present/10 text-signal-present'
          : result.type === 'info' ? 'bg-blueprint-100 text-blueprint-700'
          : 'bg-signal-absent/10 text-signal-absent'
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
  const [attendance, setAttendance] = useState([]) // admin: roster records; student: single record
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
      <div className="min-h-screen bg-paper">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-sm text-graphite/60">Loading…</p>
        </main>
      </div>
    )
  }

  const backPath = isAdmin ? '/admin/meetings' : '/student/meetings'
  const dateLabel = meeting.meeting_date
    ? new Date(`${meeting.meeting_date}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <Link to={backPath} className="text-xs font-mono uppercase tracking-wide text-blueprint-600 hover:underline">
          ← Back to meetings
        </Link>

        <div className="title-block mt-4 rounded-sm bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">
                {meeting.status} {meeting.attendance_locked && '· attendance locked'}
              </p>
              <h1 className="mt-1 font-display text-xl font-bold text-blueprint-900 sm:text-2xl">{meeting.title}</h1>
              <p className="mt-1 font-mono text-sm text-graphite/70">
                {dateLabel} · {meeting.start_time}–{meeting.end_time} · {meeting.venue || 'Venue TBD'}
              </p>
            </div>
            {isAdmin && meeting.status === 'scheduled' && (
              <button onClick={completeMeeting} className="rounded border border-blueprint-600 px-3 py-1.5 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100">
                Mark completed
              </button>
            )}
          </div>

          {meeting.description && <p className="mt-4 text-sm text-graphite/80">{meeting.description}</p>}

          {meeting.agenda_sections?.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wide text-blueprint-600">Agenda</p>
              {meeting.agenda_sections.map((s) => (
                <div key={s.id}>
                  <p className="text-sm font-semibold italic text-blueprint-900">{s.title}</p>
                  {s.bullet_points?.length > 0 && (
                    <ul className="ml-4 list-disc text-sm text-graphite/80">
                      {s.bullet_points.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && (
            <div className="mt-5 border-t border-blueprint-400/20 pt-4">
              <p className="mb-2 text-xs font-mono uppercase tracking-wide text-blueprint-600">Export</p>
              {exportError && <p className="mb-2 rounded bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{exportError}</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleExport('agenda')} disabled={exporting === 'agenda'}
                  className="rounded border border-blueprint-600 px-3 py-2 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100 disabled:opacity-60">
                  {exporting === 'agenda' ? 'Generating…' : 'Generate meeting agenda PDF'}
                </button>
                <button onClick={() => handleExport('excel')} disabled={exporting === 'excel'}
                  className="rounded border border-blueprint-600 px-3 py-2 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100 disabled:opacity-60">
                  {exporting === 'excel' ? 'Generating…' : 'Download attendance Excel'}
                </button>
                <button onClick={() => handleExport('pdf')} disabled={exporting === 'pdf'}
                  className="rounded border border-blueprint-600 px-3 py-2 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100 disabled:opacity-60">
                  {exporting === 'pdf' ? 'Generating…' : 'Download attendance PDF'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attendance code */}
        {isAdmin && meeting.status === 'scheduled' && (
          <div className="title-block mt-6 rounded-sm bg-white p-4 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-blueprint-900">Attendance code</h2>
            <AttendanceCodePanel meetingId={meeting.id} locked={meeting.attendance_locked} />
          </div>
        )}

        {!isAdmin && meeting.status === 'scheduled' && !meeting.attendance_locked && (
          <div className="title-block mt-6 rounded-sm bg-white p-4 sm:p-6">
            <h2 className="mb-1 font-display text-lg font-bold text-blueprint-900">Mark your attendance</h2>
            <p className="mb-4 text-sm text-graphite/70">
              Enter the 6-digit code your admin shares during the meeting.
            </p>
            <CodeEntryPanel onMarked={load} />
          </div>
        )}

        {/* Attendance roster / status */}
        <div className="title-block mt-6 rounded-sm bg-white p-4 sm:p-6">
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
                    <div key={s.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-blueprint-900">{s.name}</p>
                        <p className="font-mono text-xs text-graphite/50">{s.register_number || s.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map((status) => (
                          <button
                            key={status}
                            disabled={meeting.attendance_locked}
                            onClick={() => setStatus(s.id, status)}
                            className={`rounded px-2.5 py-1.5 text-xs font-medium capitalize transition-colors disabled:opacity-50 ${
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
      </main>
      {!isAdmin && <BottomNav />}
    </div>
  )
}
