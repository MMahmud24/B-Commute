import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import BusBadge from '../components/BusBadge'
import { useAuth } from '../lib/auth'
import { RESIDENCES } from '../lib/residences'
import { formatLeaveIn, formatTime, getDepartures, getHeadingHome, getNextBus, type Departure, type Plan } from '../lib/transit'
import { usePolling } from '../lib/usePolling'

function DepartureRow({ d, highlight = false }: { d: Departure; highlight?: boolean }) {
  return (
    <li className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${highlight ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''}`}>
      <div>
        <p className="font-semibold text-slate-900">Leave {formatTime(d.depart)}</p>
        <p className="text-sm text-slate-500">
          {d.from_stop} → {d.to_stop} · {formatTime(d.arrive)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <BusBadge bus={d.bus} />
        <span className="text-xs text-slate-500">{formatLeaveIn(d.leave_in_minutes)}</span>
      </div>
    </li>
  )
}

function PlanResult({ plan }: { plan: Plan }) {
  if (!plan.recommendation) {
    return <p className="mt-3 text-sm text-slate-600">No bus gets you on campus by {formatTime(plan.arrive_by)} from now.</p>
  }
  return (
    <ul className="mt-3 flex flex-col gap-1">
      <DepartureRow d={plan.recommendation} highlight />
      {plan.alternatives.map((d) => (
        <DepartureRow key={`${d.bus}-${d.depart}`} d={d} />
      ))}
    </ul>
  )
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <h2 className="font-semibold text-slate-900">{title}</h2>
    {children}
  </section>
)

export default function BusDetails() {
  const { token, user } = useAuth()
  const [arriveBy, setArriveBy] = useState('')
  const [leaveAt, setLeaveAt] = useState('') // '' means after the last class

  const nextFetcher = useCallback(() => getNextBus(token), [token])
  const homeFetcher = useCallback(() => getHeadingHome(token, leaveAt), [token, leaveAt])
  const departuresFetcher = useCallback(() => getDepartures(token, arriveBy), [token, arriveBy])
  const next = usePolling(nextFetcher).data
  const { data: departures, error } = usePolling(departuresFetcher)
  const home = usePolling(homeFetcher).data

  const residence = RESIDENCES.find((r) => r.value === user?.residence)?.label

  return (
    <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Buses from {residence}</h1>
          <Link to="/bus" className="text-sm font-medium text-indigo-600 hover:underline">
            Back
          </Link>
        </div>
        <p className="text-sm text-slate-500">Scheduled times, not live. Buses are suggested to get you on campus {next?.walk_minutes ?? 10} minutes before class.</p>

        <Card title="For your next class">
          {!next && <p className="mt-2 text-sm text-slate-500">Loading...</p>}
          {next?.status === 'no_schedule' && (
            <p className="mt-2 text-sm text-slate-600">
              <Link to="/schedule" className="font-medium text-indigo-600 hover:underline">Add your schedule</Link> to see this.
            </p>
          )}
          {next?.status === 'no_more_classes' && <p className="mt-2 text-sm text-slate-600">No more classes today.</p>}
          {next?.next_class && (next.status === 'ok' || next.status === 'no_bus') && (
            <>
              <p className="mt-1 text-sm text-slate-500">
                Class at {formatTime(next.next_class.start)} · be on campus by {next.arrive_by && formatTime(next.arrive_by)}
              </p>
              <PlanResult plan={next as Plan} />
            </>
          )}
        </Card>

        <Card title="Be on campus by...">
          <label htmlFor="arrive-by" className="mt-1 block text-sm text-slate-600">
            Pick a time and we'll show which bus to take.
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="arrive-by"
              type="time"
              value={arriveBy}
              onChange={(e) => setArriveBy(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-slate-900"
            />
            {arriveBy && (
              <button type="button" onClick={() => setArriveBy('')} className="text-sm text-slate-500 hover:text-slate-800">
                Clear
              </button>
            )}
          </div>
          {departures?.plan && <PlanResult plan={departures.plan} />}
        </Card>

        <Card title="Heading home">
          <p className="mt-1 text-sm text-slate-600">
            {leaveAt
              ? `Leaving at ${formatTime(leaveAt)}.`
              : home?.source === 'last_class' && home.leave_at
                ? `After your last class (ends ${formatTime(home.leave_at)}).`
                : 'The next bus from campus.'}{' '}
            Includes a {home?.walk_minutes ?? 10} minute walk to the stop.
          </p>
          <label htmlFor="leave-at" className="mt-3 block text-sm text-slate-600">
            Leaving early or staying for an event? Pick when you're leaving.
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="leave-at"
              type="time"
              value={leaveAt}
              onChange={(e) => setLeaveAt(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-slate-900"
            />
            {leaveAt && (
              <button type="button" onClick={() => setLeaveAt('')} className="text-sm text-slate-500 hover:text-slate-800">
                Use my last class
              </button>
            )}
          </div>
          {home?.status === 'no_bus' && <p className="mt-3 text-sm text-slate-600">No more buses home today.</p>}
          {home?.recommendation && (
            <ul className="mt-3 flex flex-col gap-1">
              <DepartureRow d={home.recommendation} highlight />
              {home.alternatives?.map((d) => (
                <DepartureRow key={`${d.bus}-${d.depart}`} d={d} />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming departures to campus">
          {error && !departures && <p className="mt-2 text-sm text-slate-600">Couldn't load departures.</p>}
          {departures && departures.upcoming.length === 0 && <p className="mt-2 text-sm text-slate-600">No more buses today.</p>}
          <ul className="mt-2 flex flex-col gap-1">
            {departures?.upcoming.map((d) => (
              <DepartureRow key={`${d.bus}-${d.depart}`} d={d} />
            ))}
          </ul>
        </Card>
    </div>
  )
}
