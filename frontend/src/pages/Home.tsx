import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { RESIDENCES } from '../lib/residences'

export default function Home() {
  const { user, logout } = useAuth()
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-900">B-Commute</h1>
      <p className="text-slate-600">
        Signed in as {user?.first_name} {user?.last_name} (@{user?.username})
      </p>
      <p className="text-sm text-slate-500">Lives at: {RESIDENCES.find((r) => r.value === user?.residence)?.label}</p>
      <Link to="/schedule" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
        Edit my schedule
      </Link>
      <button onClick={logout} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white">
        Log out
      </button>
    </main>
  )
}
