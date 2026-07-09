import { TceLogo } from './ui/Logos'

/**
 * App opening screen (Requirement: match the provided splash reference —
 * centered college emblem over a white background with a loading bar
 * beneath it). Shown once per app load in App.jsx, not on every route
 * change.
 */
export default function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="animate-fade-in-up flex flex-col items-center">
        <TceLogo size={132} className="shadow-glow-sm" />
        <p className="mt-6 text-center font-display text-base font-semibold text-slate-700">
          Thiagarajar College of Engineering
        </p>
        <p className="mt-1 text-center text-xs uppercase tracking-widest text-slate-400">
          Civil Engineering Association
        </p>
      </div>

      <div className="mt-10 h-1.5 w-56 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/2 animate-splash-slide rounded-full bg-accent" />
      </div>
    </div>
  )
}
