import { useCallback, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { formatLeaveIn, formatTime, getHeadingHome } from '../lib/transit'
import { usePolling } from '../lib/usePolling'
import BusBadge from './BusBadge'

export default function HeadingHomeCard() {
  const { token } = useAuth()
  const fetcher = useCallback(() => getHeadingHome(token), [token])
  const { data, error } = usePolling(fetcher)

  const rec = data?.recommendation
  let body: ReactNode

  if (error && !data) {
    body = <p className="text-slate-600">Couldn't load bus times right now.</p>
  } else if (!data) {
    body = <p className="text-slate-500">Checking buses...</p>
  } else if (data.status === 'no_bus' || !rec) {
    body = <p className="text-slate-700">No more buses home today.</p>
  } else {
    body = (
      <>
        <p className="text-sm text-slate-500">Next bus at:</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{formatTime(rec.depart)}</p>
        <div className="mt-2 flex items-center gap-2">
          <BusBadge bus={rec.bus} />
          <span className="text-sm text-slate-600">
            {formatLeaveIn(rec.leave_in_minutes)} · home {formatTime(rec.arrive)}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-700">
          {rec.from_stop} → {rec.to_stop}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {data.source === 'last_class' && data.leave_at ? `After your last class (ends ${formatTime(data.leave_at)})` : 'Next bus from campus'}
        </p>
      </>
    )
  }

  return (
    <Link to="/bus/details" className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">Heading home?</p>
      {body}
      <p className="mt-3 text-xs text-slate-400">Leaving earlier or later? Tap to pick a time.</p>
      <p className="text-xs text-slate-400">Scheduled times, not live</p>
    </Link>
  )
}
