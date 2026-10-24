import { useEffect, useState } from 'react'

// Runs `fetcher` now and then every `intervalMs`, so times on screen follow the clock.
// `fetcher` must be stable (wrap it in useCallback) or the effect restarts every render.
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 30_000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetcher()
        .then((result) => {
          if (cancelled) return
          setData(result)
          setError(false)
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
    load()
    const id = setInterval(load, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [fetcher, intervalMs])

  return { data, error }
}
