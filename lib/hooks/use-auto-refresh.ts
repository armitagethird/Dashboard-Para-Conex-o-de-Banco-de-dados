'use client'

import { useEffect, useRef, useState } from 'react'

interface UseAutoRefreshOptions {
  fetchFn: () => Promise<void> | void
  pollIntervalMs?: number
  visibilityThresholdMs?: number
  enabled?: boolean
}

export function useAutoRefresh({
  fetchFn,
  pollIntervalMs = 60_000,
  visibilityThresholdMs = 10_000,
  enabled = true,
}: UseAutoRefreshOptions) {
  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now())
  const fetchFnRef = useRef(fetchFn)

  useEffect(() => {
    fetchFnRef.current = fetchFn
  })

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(async () => {
      await fetchFnRef.current()
      setLastUpdated(Date.now())
    }, pollIntervalMs)
    return () => clearInterval(id)
  }, [enabled, pollIntervalMs])

  useEffect(() => {
    if (!enabled) return
    let hiddenSince: number | null = null

    function onVisibility() {
      if (document.hidden) {
        hiddenSince = Date.now()
        return
      }
      if (hiddenSince && Date.now() - hiddenSince > visibilityThresholdMs) {
        Promise.resolve(fetchFnRef.current()).then(() => {
          setLastUpdated(Date.now())
        })
      }
      hiddenSince = null
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [enabled, visibilityThresholdMs])

  return {
    lastUpdated,
    markUpdated: () => setLastUpdated(Date.now()),
  }
}
