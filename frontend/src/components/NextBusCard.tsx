import { useCallback, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { formatLeaveIn, formatTime, getNextBus } from '../lib/transit'
import { usePolling } from '../lib/usePolling'
import BusBadge from './BusBadge'

export default function NextBusCard() {
  const { token } = useAuth()
  const fetcher = useCallback(() => getNextBus(token), [token])
  const { data, error } = usePolling(fetcher)

  let to = '/bus/details'
  let body: ReactNode

  if (error && !data) {
    body = <p className="text-slate-600">Couldn't load bus times right now.</p>
  } else if (!data) {
    body = <p className="text-slate-500">Checking buses...</p>
  } else if (data.status === 'no_schedule') {
    to = '/schedule'
    body = <p className="text-slate-700">Add your schedule to see when to catch the bus.</p>
  } else if (data.status === 'no_more_classes') {
    body = <p className="text-slate-700">No more classes today. Tap to see upcoming buses.</p>
  } else if (data.status === 'no_bus' && data.next_class) {
    body = (
      <>
        <p className="text-sm text-slate-500">Next class at {formatTime(data.next_class.start)}</p>
        <p className="mt-1 font-semibold text-slate-900">No bus gets you there in time.</p>
        <p className="text-sm text-slate-600">Tap to see later options.</p>
      </>
    )
  } else if (data.status === 'ok' && data.recommendation && data.next_class) {
    const rec = data.recommendation
    body = (
      <>
        <p className="text-sm text-slate-500">Next class at {formatTime(data.next_class.start)}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">Leave at {formatTime(rec.depart)}</p>
        <div className="mt-2 flex items-center gap-2">
          <BusBadge bus={rec.bus} />
          <span className="text-sm text-slate-600">
            {formatLeaveIn(rec.leave_in_minutes)} · on campus {formatTime(rec.arrive)}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-700">
          {rec.from_stop} → {rec.to_stop}
        </p>
      </>
    )
  } else {
    body = <p className="text-slate-600">Couldn't load bus times right now.</p>
  }

  return (
    <Link to={to} className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">Your next bus</p>
      {body}
      <p className="mt-3 text-xs text-slate-400">Scheduled times, not live</p>
    </Link>
  )
}
