import { useEffect, useRef, useState } from 'react'

const READER_ID = 'cea-qr-reader'

export default function QRScanner({ onDecode, active }) {
  const scannerRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)
  const [manualToken, setManualToken] = useState('')

  useEffect(() => {
    if (!active) return undefined

    let isMounted = true

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!isMounted) return
      const scanner = new Html5Qrcode(READER_ID)
      scannerRef.current = scanner

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            onDecode(decodedText)
          },
          () => {
            // per-frame decode failures are normal while aiming the camera — ignore
          }
        )
        .catch((err) => {
          setCameraError(
            'Could not access the camera. Check your browser permissions, or enter the code manually below.'
          )
        })
    })

    return () => {
      isMounted = false
      const scanner = scannerRef.current
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
    }
  }, [active, onDecode])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualToken.trim()) onDecode(manualToken.trim())
  }

  return (
    <div>
      <div id={READER_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-sm border border-blueprint-400/40 bg-blueprint-900" />

      {cameraError && (
        <p className="mt-3 rounded bg-signal-late/10 px-3 py-2 text-sm text-signal-late">{cameraError}</p>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-wide text-blueprint-600">
          Enter code manually instead
        </summary>
        <form onSubmit={handleManualSubmit} className="mt-2 flex gap-2">
          <input
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste QR code value"
            className="flex-1 rounded border border-blueprint-400/40 px-3 py-2 text-sm focus:border-blueprint-600 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-blueprint-800 px-4 py-2 text-sm font-semibold text-paper hover:bg-blueprint-700"
          >
            Submit
          </button>
        </form>
      </details>
    </div>
  )
}
