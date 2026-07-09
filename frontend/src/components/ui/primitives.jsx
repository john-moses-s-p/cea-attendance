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
    primary: 'bg-accent text-white hover:bg-accent-soft shadow-glow-sm',
    outline: 'border border-accent/40 text-accent hover:bg-accent/10',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'border border-rose-300 text-rose-600 hover:bg-rose-50',
  }
  return (
    <As className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </As>
  )
}

const MEETING_STATUS_STYLE = {
  scheduled: 'bg-accent/15 text-accent',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

export function MeetingStatusBadge({ status }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${MEETING_STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

const ATTENDANCE_STATUS_STYLE = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-rose-100 text-rose-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-violet-100 text-violet-700',
}

export function AttendanceStatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${ATTENDANCE_STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}
