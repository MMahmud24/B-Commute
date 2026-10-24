const COLORS: Record<string, string> = {
  'ITC-UClub': 'bg-amber-100 text-amber-800',
  'UClub': 'bg-sky-100 text-sky-800',
}

export default function BusBadge({ bus }: { bus: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[bus] ?? 'bg-slate-100 text-slate-700'}`}>{bus}</span>
}
