import { apiFetch } from './api'

export interface Departure {
  bus: string
  depart: string // 24-hour HH:MM
  arrive: string
  from_stop: string
  to_stop: string
  leave_in_minutes: number
}

export interface Plan {
  status: 'ok' | 'no_bus'
  arrive_by: string
  recommendation: Departure | null
  alternatives: Departure[]
}

export interface NextBus extends Partial<Omit<Plan, 'status'>> {
  status: 'ok' | 'no_bus' | 'no_residence' | 'no_schedule' | 'no_more_classes'
  now: string
  walk_minutes: number
  next_class?: { start: string; end: string }
}

export interface Departures {
  status: 'ok' | 'no_residence'
  now: string
  upcoming: Departure[]
  plan: Plan | null
}

export interface HeadingHome {
  status: 'ok' | 'no_bus' | 'no_residence'
  now: string
  walk_minutes: number
  source?: 'last_class' | 'custom' | 'now'
  leave_at?: string | null // last class end, or the time the student picked
  at_stop_by?: string
  recommendation?: Departure | null
  alternatives?: Departure[]
}

export const getHeadingHome = (token: string | null, leaveAt?: string) =>
  apiFetch<HeadingHome>(`/transit/home/${leaveAt ? `?leave_at=${leaveAt}` : ''}`, { token })

export const getNextBus = (token: string | null) => apiFetch<NextBus>('/transit/next/', { token })

export const getDepartures = (token: string | null, arriveBy?: string) =>
  apiFetch<Departures>(`/transit/departures/${arriveBy ? `?arrive_by=${arriveBy}` : ''}`, { token })

// "13:05" -> "1:05 PM"
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export function formatLeaveIn(minutes: number) {
  if (minutes <= 0) return 'Leave now'
  if (minutes < 60) return `in ${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `in ${h} h ${m} min` : `in ${h} h`
}
