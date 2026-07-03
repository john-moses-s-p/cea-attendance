import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import client from '../api/client'
import Navbar from '../components/Navbar'

const COLUMNS = [
  { key: 'name', label: 'Name', numeric: false },
  { key: 'email', label: 'Email', numeric: false },
  { key: 'register_number', label: 'Register No.', numeric: false },
  { key: 'department', label: 'Department', numeric: false },
  { key: 'meetings_attended', label: 'Attended', numeric: true },
  { key: 'meetings_absent', label: 'Absent', numeric: true },
  { key: 'meetings_excused', label: 'Excused', numeric: true },
  { key: 'attendance_percentage', label: 'Attendance %', numeric: true },
]

function percentTone(pct) {
  if (pct === null || pct === undefined) return 'text-graphite/50'
  if (pct >= 75) return 'text-signal-present'
  if (pct >= 50) return 'text-signal-late'
  return 'text-signal-absent'
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

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

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
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-blueprint-600">Analytics</p>
            <h1 className="font-display text-2xl font-bold text-blueprint-900">Attendance analytics</h1>
            <p className="mt-1 text-xs text-graphite/60">
              Based on {totalMeetings} non-cancelled meeting{totalMeetings === 1 ? '' : 's'} on record.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={loading || filteredSorted.length === 0}
            className="rounded bg-blueprint-800 px-4 py-2 text-sm font-semibold text-paper hover:bg-blueprint-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export to Excel
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, register number, or department…"
            className="w-full max-w-md rounded border border-blueprint-400/40 bg-white px-3 py-2 text-sm text-graphite placeholder:text-graphite/40 focus:border-blueprint-600 focus:outline-none"
          />
        </div>

        {error && (
          <p className="mb-4 rounded border border-signal-absent/40 bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-graphite/60">Loading…</p>
        ) : filteredSorted.length === 0 ? (
          <p className="text-sm text-graphite/60">No students match your search.</p>
        ) : (
          <div className="title-block overflow-x-auto rounded-sm bg-white">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-blueprint-800/20 bg-blueprint-100/40">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`cursor-pointer select-none px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-blueprint-700 hover:text-blueprint-900 ${
                        col.numeric ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.label}
                      {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((r) => (
                  <tr key={r.student_id} className="border-b border-blueprint-400/10 last:border-0 hover:bg-blueprint-100/20">
                    <td className="px-4 py-2 font-medium text-blueprint-900">{r.name}</td>
                    <td className="px-4 py-2 text-graphite/80">{r.email}</td>
                    <td className="px-4 py-2 font-mono text-xs text-graphite/70">{r.register_number || '—'}</td>
                    <td className="px-4 py-2 text-graphite/70">{r.department || '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-signal-present">{r.meetings_attended}</td>
                    <td className="px-4 py-2 text-right font-mono text-signal-absent">{r.meetings_absent}</td>
                    <td className="px-4 py-2 text-right font-mono text-signal-excused">{r.meetings_excused}</td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${percentTone(r.attendance_percentage)}`}>
                      {r.attendance_percentage === null ? '—' : `${r.attendance_percentage}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
