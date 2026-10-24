import type { ReactNode } from 'react'

export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">{title}</h1>
        {children}
      </div>
    </main>
  )
}
