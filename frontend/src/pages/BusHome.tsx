import HeadingHomeCard from '../components/HeadingHomeCard'
import NextBusCard from '../components/NextBusCard'
import { useAuth } from '../lib/auth'
import { RESIDENCES } from '../lib/residences'

export default function BusHome() {
  const { user } = useAuth()
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hi, {user?.first_name}</h1>
        <p className="text-sm text-slate-500">Lives at: {RESIDENCES.find((r) => r.value === user?.residence)?.label}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NextBusCard />
        <HeadingHomeCard />
      </div>
    </div>
  )
}
