import { useEffect, useState, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import client from '../api/client'

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return '0:00'
  const totalSeconds = Math.floor(msRemaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function QRCodeGenerator({ meetingId, locked, onScanRecorded }) {
  const [session, setSession] = useState(null)
  const [logs, setLogs] = useState([])
  const [expiryMinutes, setExpiryMinutes] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(Date.now())
  const pollRef = useRef(null)

  const loadActive = useCallback(async () => {
    try {
      const { data } = await client.get(`/api/attendance/qr/active/${meetingId}`)
      setSession(data.session)
      setError(null)
    } catch (err) {
      setError('Could not load QR status')
    } finally {
      setLoading(false)
    }
  }, [meetingId])

  const loadLogs = useCallback(async () => {
    try {
      const { data } = await client.get(`/api/attendance/qr/logs/${meetingId}`)
      setLogs(data.logs.slice(0, 8))
    } catch {
      // non-critical — ignore
    }
  }, [meetingId])

  useEffect(() => {
    loadActive()
    loadLogs()
  }, [loadActive, loadLogs])

  // Poll while a session is active: refresh countdown, scan logs, and let
  // the parent re-fetch the attendance roster so new scans show up live.
  useEffect(() => {
    if (!session) {
      clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(() => {
      setNow(Date.now())
      loadLogs()
      onScanRecorded?.()
    }, 4000)
    return () => clearInterval(pollRef.current)
  }, [session, loadLogs, onScanRecorded])

  const handleGenerate = async () => {
    setError(null)
    try {
      const { data } = await client.post(`/api/attendance/qr/generate/${meetingId}`, {
        expiry_minutes: Number(expiryMinutes) || 10,
      })
      setSession(data.session)
      loadLogs()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate QR code')
    }
  }

  const handleRevoke = async () => {
    await client.post(`/api/attendance/qr/revoke/${meetingId}`)
    setSession(null)
  }

  if (locked) {
    return (
      <p className="text-sm text-graphite/60">
        Attendance is locked for this meeting — QR check-in is no longer available.
      </p>
    )
  }

  if (loading) return <p className="text-sm text-graphite/60">Loading QR status…</p>

  const expiresAt = session ? new Date(session.expires_at).getTime() : null
  const msRemaining = expiresAt ? expiresAt - now : 0
  const expired = session && msRemaining <= 0

  if (expired) {
    // Auto-refresh once expiry is reached client-side; server also self-heals on next check.
    setTimeout(loadActive, 200)
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{error}</p>
      )}

      {!session || expired ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-mono uppercase tracking-wide text-blueprint-600">
              Expires after (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(e.target.value)}
              className="w-24 rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="rounded bg-blueprint-800 px-4 py-2 text-sm font-semibold text-paper hover:bg-blueprint-700"
          >
            Generate QR code
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
          <div className="rounded-sm border border-blueprint-400/30 bg-white p-3">
            <QRCodeSVG value={session.token} size={168} bgColor="#ffffff" fgColor="#0F3A5F" level="M" />
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-blueprint-900">
              {formatCountdown(msRemaining)}
            </p>
            <p className="text-xs uppercase tracking-wide text-graphite/60">Time remaining</p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleGenerate}
                className="rounded border border-blueprint-600 px-3 py-1.5 text-xs font-semibold text-blueprint-700 hover:bg-blueprint-100"
              >
                Regenerate
              </button>
              <button
                onClick={handleRevoke}
                className="rounded border border-signal-absent px-3 py-1.5 text-xs font-semibold text-signal-absent hover:bg-signal-absent/10"
              >
                Revoke now
              </button>
            </div>

            {logs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-mono uppercase tracking-wide text-blueprint-600">Recent scan activity</p>
                <ul className="mt-1 space-y-1">
                  {logs.map((l) => (
                    <li key={l.id} className="flex justify-between text-xs">
                      <span className="text-graphite/70">{l.student_name || 'Unknown'}</span>
                      <span
                        className={
                          l.result === 'success'
                            ? 'text-signal-present'
                            : l.result === 'duplicate'
                            ? 'text-blueprint-600'
                            : 'text-signal-absent'
                        }
                      >
                        {l.result}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
