import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import Navbar from '../components/Navbar'
import QRScanner from '../components/QRScanner'

export default function ScanAttendance() {
  const [result, setResult] = useState(null) // { type: 'success'|'info'|'error', message }
  const [scanning, setScanning] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleDecode = useCallback(async (token) => {
    if (submitting) return
    setSubmitting(true)
    setScanning(false)
    try {
      const { data } = await client.post('/api/attendance/qr/scan', { token })
      setResult({ type: 'success', message: data.message })
    } catch (err) {
      const status = err.response?.status
      const message = err.response?.data?.error || 'Could not mark attendance.'
      setResult({ type: status === 409 && message.includes('already') ? 'info' : 'error', message })
    } finally {
      setSubmitting(false)
    }
  }, [submitting])

  const scanAgain = () => {
    setResult(null)
    setScanning(true)
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-lg px-6 py-8">
        <Link to="/student" className="text-xs font-mono uppercase tracking-wide text-blueprint-600 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="title-block mt-4 rounded-sm bg-white p-6">
          <h1 className="font-display text-xl font-bold text-blueprint-900">Scan attendance</h1>
          <p className="mt-1 text-sm text-graphite/70">
            Point your camera at the QR code shown by your admin during the meeting.
          </p>

          <div className="mt-5">
            {scanning && <QRScanner active={scanning} onDecode={handleDecode} />}

            {submitting && <p className="mt-4 text-sm text-graphite/60">Marking attendance…</p>}

            {result && (
              <div
                className={`mt-4 rounded px-4 py-3 text-sm ${
                  result.type === 'success'
                    ? 'bg-signal-present/10 text-signal-present'
                    : result.type === 'info'
                    ? 'bg-blueprint-100 text-blueprint-700'
                    : 'bg-signal-absent/10 text-signal-absent'
                }`}
              >
                {result.message}
              </div>
            )}

            {result && (
              <button
                onClick={scanAgain}
                className="mt-4 rounded border border-blueprint-600 px-4 py-2 text-sm font-semibold text-blueprint-700 hover:bg-blueprint-100"
              >
                Scan another code
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
