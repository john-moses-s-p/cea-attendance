/**
 * Renders the CEA and TCE logos. Used in three layouts:
 *  - "row": CEA on the left, TCE on the right (desktop navbar)
 *  - "center": both logos side by side, centered (login page)
 *  - "welcome": smaller inline pairing (dashboard welcome banner)
 *
 * Logo files live in /public — replace /cea-tce.jpg and /tce-logo.webp with
 * your actual artwork; these are placeholder badges so the app renders
 * correctly out of the box.
 */
export default function Logos({ layout = 'row', size = 40 }) {
  const dimension = { height: size, width: size }

  if (layout === 'center') {
    return (
      <div className="flex items-center justify-center gap-6">
        <img src="/cea-tce.jpg" alt="Civil Engineering Association" style={dimension} className="rounded-full object-cover shadow-glow-sm" />
        <div className="h-8 w-px bg-slate-600/50" />
        <img src="/tce-logo.webp" alt="Thiagarajar College of Engineering" style={dimension} className="rounded-full bg-white object-cover p-0.5 shadow-glow-sm" />
      </div>
    )
  }

  if (layout === 'welcome') {
    return (
      <div className="flex items-center gap-2">
        <img src="/cea-tce.jpg" alt="CEA" style={dimension} className="rounded-full object-cover" />
        <img src="/tce-logo.webp" alt="TCE" style={dimension} className="rounded-full bg-white object-cover p-0.5" />
      </div>
    )
  }

  // "row": logo left, logo right — used as two separate calls in a flex
  // parent (see Navbar), so just expose single-logo variants too.
  return (
    <div className="flex items-center gap-3">
      <img src="/cea-tce.jpg" alt="Civil Engineering Association" style={dimension} className="rounded-full object-cover" />
      <img src="/tce-logo.webp" alt="Thiagarajar College of Engineering" style={dimension} className="rounded-full bg-white object-cover p-0.5" />
    </div>
  )
}

export function CeaLogo({ size = 40, className = '' }) {
  return (
    <img src="/cea-tce.jpg" alt="Civil Engineering Association" style={{ height: size, width: size }}
      className={`rounded-full object-cover ${className}`} />
  )
}

export function TceLogo({ size = 40, className = '' }) {
  return (
    <img src="/tce-logo.webp" alt="Thiagarajar College of Engineering" style={{ height: size, width: size }}
      className={`rounded-full bg-white object-cover p-0.5 ${className}`} />
  )
}
