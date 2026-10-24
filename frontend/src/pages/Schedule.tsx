import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { DAYS, emptySchedule, getSchedule, saveSchedule, validateSchedule, type Day, type Schedule as ScheduleData } from '../lib/schedule'

type Status = { kind: 'idle' } | { kind: 'saved' } | { kind: 'error'; message: string }

export default function Schedule() {
  const { token } = useAuth()
  const [schedule, setSchedule] = useState<ScheduleData>(emptySchedule)
  const [errors, setErrors] = useState<Partial<Record<Day, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    getSchedule(token)
      .then(setSchedule)
      .catch(() => setStatus({ kind: 'error', message: 'Could not load your schedule.' }))
      .finally(() => setLoading(false))
  }, [token])

  const change = (next: ScheduleData) => {
    setSchedule(next)
    setStatus({ kind: 'idle' })
  }
  const addSlot = (day: Day) => change({ ...schedule, [day]: [...schedule[day], { start: '', end: '' }] })
  const removeSlot = (day: Day, i: number) => change({ ...schedule, [day]: schedule[day].filter((_, idx) => idx !== i) })
  const updateSlot = (day: Day, i: number, field: 'start' | 'end', value: string) =>
    change({ ...schedule, [day]: schedule[day].map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const clientErrors = validateSchedule(schedule)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSaving(true)
    try {
      setSchedule(await saveSchedule(token, schedule))
      setStatus({ kind: 'saved' })
    } catch (err) {
      if (err instanceof ApiError) {
        const serverErrors: Partial<Record<Day, string>> = {}
        for (const day of DAYS) if (err.fieldErrors[day]) serverErrors[day] = err.fieldErrors[day].join(' ')
        setErrors(serverErrors)
        setStatus({ kind: 'error', message: err.fieldErrors.non_field_errors?.[0] ?? 'Please fix the highlighted days.' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <form onSubmit={onSubmit} noValidate className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">My weekly schedule</h1>
          <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">
            Back
          </Link>
        </div>
        <p className="text-sm text-slate-600">Add the time ranges you need to be somewhere each day. Saving replaces your previous schedule.</p>

        {DAYS.map((day) => (
          <section key={day} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold capitalize text-slate-900">{day}</h2>
              <button type="button" onClick={() => addSlot(day)} className="text-sm font-medium text-indigo-600 hover:underline">
                + Add time
              </button>
            </div>
            {schedule[day].length === 0 && <p className="mt-2 text-sm text-slate-400">Nothing scheduled</p>}
            <ul className="mt-2 flex flex-col gap-2">
              {schedule[day].map((slot, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${day} time ${i + 1} start`}
                    value={slot.start}
                    onChange={(e) => updateSlot(day, i, 'start', e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-slate-900"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="time"
                    aria-label={`${day} time ${i + 1} end`}
                    value={slot.end}
                    onChange={(e) => updateSlot(day, i, 'end', e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-slate-900"
                  />
                  <button type="button" onClick={() => removeSlot(day, i)} aria-label={`Remove ${day} time ${i + 1}`} className="ml-auto text-sm text-slate-500 hover:text-red-600">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {errors[day] && <p className="mt-2 text-sm text-red-600">{errors[day]}</p>}
          </section>
        ))}

        {status.kind === 'error' && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.message}</p>}
        {status.kind === 'saved' && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Schedule saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save schedule'}
        </button>
      </form>
    </main>
  )
}
