import { apiFetch } from './api'

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type Day = (typeof DAYS)[number]

export interface Slot {
  start: string
  end: string
}

export type Schedule = Record<Day, Slot[]>

export const emptySchedule = (): Schedule => Object.fromEntries(DAYS.map((d) => [d, []])) as unknown as Schedule

export const getSchedule = (token: string | null) => apiFetch<Schedule>('/schedule/', { token })

export const saveSchedule = (token: string | null, schedule: Schedule) =>
  apiFetch<Schedule>('/schedule/', { method: 'PUT', body: JSON.stringify(schedule), token })

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

// Mirrors the backend rules (start < end, no overlaps) for instant feedback. Returns one message per day.
export function validateSchedule(schedule: Schedule): Partial<Record<Day, string>> {
  const errors: Partial<Record<Day, string>> = {}
  for (const day of DAYS) {
    const slots = schedule[day]
    if (slots.some((s) => !s.start || !s.end)) {
      errors[day] = 'Fill in both a start and end time, or remove the row.'
      continue
    }
    const bad = slots.find((s) => toMinutes(s.start) >= toMinutes(s.end))
    if (bad) {
      errors[day] = `${bad.start}-${bad.end}: the start time must be before the end time.`
      continue
    }
    const sorted = [...slots].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].start) < toMinutes(sorted[i - 1].end)) {
        errors[day] = `${sorted[i].start}-${sorted[i].end} overlaps with another time on the same day.`
        break
      }
    }
  }
  return errors
}
