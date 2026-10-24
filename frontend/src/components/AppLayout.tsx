import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { TABS } from '../lib/tabs'

export default function AppLayout() {
  const { logout } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-slate-900">B-Commute</span>
          <div className="flex items-center gap-4 text-sm">
            <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'font-semibold text-indigo-600' : 'text-slate-600 hover:text-slate-900')}>
              Schedule
            </NavLink>
            <button onClick={logout} className="text-slate-600 hover:text-slate-900">
              Log out
            </button>
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto flex w-full max-w-2xl gap-2 px-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `border-b-2 px-4 py-2 text-sm font-medium ${
                  isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
