import { useAuth } from '../lib/auth'

export default function Home() {
  const { user, logout } = useAuth()
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-900">B-Commute</h1>
      <p className="text-slate-600">
        Signed in as {user?.first_name} {user?.last_name} (@{user?.username})
      </p>
      <button onClick={logout} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white">
        Log out
      </button>
    </main>
  )
}
