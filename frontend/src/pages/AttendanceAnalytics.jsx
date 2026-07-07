import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import client from '../api/client'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import PageTransition from '../components/ui/PageTransition'
import { Card, Button } from '../components/ui/primitives'

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'attendance_percentage', label: 'Attendance %' },
  { key: 'meetings_attended', label: 'Attended' },
  { key: 'meetings_absent', label: 'Absent' },
]

function percentTone(pct) {
  if (pct === null || pct === undefined) return 'text-slate-500'
  if (pct >= 75) return 'text-emerald-300'
  if (pct >= 50) return 'text-amber-300'
  return 'text-rose-300'
}

export default function AttendanceAnalytics() {
  const [rows, setRows] = useState([])
  const [totalMeetings, setTotalMeetings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    client
      .get('/api/analytics/attendance')
      .then(({ data }) => {
        setRows(data.students)
        setTotalMeetings(data.total_meetings_overall)
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load attendance analytics.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = rows
    if (q) {
      result = rows.filter((r) =>
        [r.name, r.email, r.register_number, r.department]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
      )
    }

    const sorted = [...result].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return sorted
  }, [rows, search, sortKey, sortDir])

  const handleExport = () => {
    const data = filteredSorted.map((r) => ({
      Name: r.name,
      Email: r.email,
      'Register No.': r.register_number || '',
      Department: r.department || '',
      'Meetings Attended': r.meetings_attended,
      'Meetings Absent': r.meetings_absent,
      'Meetings Excused': r.meetings_excused,
      'Total Countable Meetings': r.total_meetings,
      'Attendance %': r.attendance_percentage ?? '',
      Status: r.is_active ? 'Active' : 'Inactive',
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 18 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Analytics')

    const stamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `attendance-analytics-${stamp}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-navy bg-glow-radial pb-24 md:pb-0">
      <Navbar />
      <PageTransition>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Analytics</p>
              <h1 className="font-display text-2xl font-bold text-slate-100">Attendance analytics</h1>
              <p className="mt-1 text-xs text-slate-400">
                Based on {totalMeetings} non-cancelled meeting{totalMeetings === 1 ? '' : 's'} on record.
              </p>
            </div>
            <Button onClick={handleExport} disabled={loading || filteredSorted.length === 0}>
              Export to Excel
            </Button>
          </div>

          <Card className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, register no., department…"
              className="w-full flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
            />
            <div className="flex gap-2">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 focus:border-accent focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key} className="bg-navy-card">{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="glow-btn rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100"
                title="Toggle sort direction"
              >
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </Card>

          {error && (
            <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : filteredSorted.length === 0 ? (
            <p className="text-sm text-slate-400">No students match your search.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSorted.map((r, i) => (
                <Card key={r.student_id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">{r.name}</p>
                      <p className="truncate text-xs text-slate-400">{r.email}</p>
                    </div>
                    <p className={`shrink-0 font-mono text-lg font-bold ${percentTone(r.attendance_percentage)}`}>
                      {r.attendance_percentage === null ? '—' : `${r.attendance_percentage}%`}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{r.register_number || 'No reg. no.'}</span>
                    <span>·</span>
                    <span>{r.department || 'No department'}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center">
                    <div>
                      <p className="font-mono text-sm font-semibold text-emerald-300">{r.meetings_attended}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Attended</p>
                    </div>
                    <div>
                      <p className="font-mono text-sm font-semibold text-rose-300">{r.meetings_absent}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Absent</p>
                    </div>
                    <div>
                      <p className="font-mono text-sm font-semibold text-violet-300">{r.meetings_excused}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Excused</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
