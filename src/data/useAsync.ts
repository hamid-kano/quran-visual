import { useEffect, useState } from 'react'

export type AsyncState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: Error }

type Settled<T> = { key: string } & (
  { status: 'ready'; data: T } | { status: 'error'; error: Error }
)

/**
 * Runs a promise-returning loader and tracks its state. `key` identifies the request:
 * when it changes, the state is "loading" until the new promise settles.
 */
export function useAsync<T>(loader: () => Promise<T>, key: string): AsyncState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  useEffect(() => {
    let alive = true
    loader().then(
      (data) => alive && setSettled({ key, status: 'ready', data }),
      (error: unknown) =>
        alive &&
        setSettled({
          key,
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    )
    return () => {
      alive = false
    }
    // the loader is identified by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!settled || settled.key !== key) return { status: 'loading' }
  return settled.status === 'ready'
    ? { status: 'ready', data: settled.data }
    : { status: 'error', error: settled.error }
}
