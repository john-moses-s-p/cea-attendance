export function Card({ children, className = '', glow = false, ...props }) {
  return (
    <div className={`glass-card rounded-2xl p-4 sm:p-5 ${glow ? 'shadow-glow-sm' : ''} ${className}`} {...props}>
      {children}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', as: As = 'button', ...props }) {
  const base = 'glow-btn inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-accent text-navy hover:bg-accent-soft shadow-glow-sm',
    outline: 'border border-accent/40 text-accent hover:bg-accent/10',
    ghost: 'text-slate-300 hover:bg-white/5',
    danger: 'border border-rose-400/50 text-rose-300 hover:bg-rose-400/10',
  }
  return (
    <As className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </As>
  )
}

const MEETING_STATUS_STYLE = {
  scheduled: 'bg-accent/15 text-accent',
  completed: 'bg-emerald-400/20 text-emerald-300',
  cancelled: 'bg-rose-400/20 text-rose-300',
}

export function MeetingStatusBadge({ status }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${MEETING_STATUS_STYLE[status] || 'bg-white/10 text-slate-300'}`}>
      {status}
    </span>
  )
}

const ATTENDANCE_STATUS_STYLE = {
  present: 'bg-emerald-400/20 text-emerald-300',
  absent: 'bg-rose-400/20 text-rose-300',
  late: 'bg-amber-400/20 text-amber-300',
  excused: 'bg-violet-400/20 text-violet-300',
}

export function AttendanceStatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${ATTENDANCE_STATUS_STYLE[status] || 'bg-white/10 text-slate-300'}`}>
      {status}
    </span>
  )
}
