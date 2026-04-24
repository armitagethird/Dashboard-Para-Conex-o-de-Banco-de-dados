'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ConnectionStatus = 'online' | 'slow' | 'offline'

interface ConnectionContextValue {
  status: ConnectionStatus
  latencyMs: number | null
}

const ConnectionContext = createContext<ConnectionContextValue>({
  status: 'online',
  latencyMs: null,
})

const PING_INTERVAL_MS = 20_000
const SLOW_THRESHOLD_MS = 400
const OFFLINE_THRESHOLD_MS = 1_500

function classify(
  latencyMs: number | null,
  browserOnline: boolean,
  realtimeBad: boolean
): ConnectionStatus {
  if (!browserOnline || realtimeBad) return 'offline'
  if (latencyMs == null) return 'online'
  if (latencyMs > OFFLINE_THRESHOLD_MS) return 'offline'
  if (latencyMs > SLOW_THRESHOLD_MS) return 'slow'
  return 'online'
}

export function ConnectionStatusProvider({ children }: { children: React.ReactNode }) {
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    () => typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [realtimeBad, setRealtimeBad] = useState(false)

  useEffect(() => {
    function onOnline() { setBrowserOnline(true) }
    function onOffline() { setBrowserOnline(false) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function ping() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      const t0 = performance.now()
      try {
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        const dt = performance.now() - t0
        setLatencyMs(error ? OFFLINE_THRESHOLD_MS + 1 : dt)
      } catch {
        if (cancelled) return
        setLatencyMs(OFFLINE_THRESHOLD_MS + 1)
      }
    }

    ping()
    const id = setInterval(ping, PING_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('connection-heartbeat')
      .subscribe((s) => {
        setRealtimeBad(s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED')
      })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const status = classify(latencyMs, browserOnline, realtimeBad)

  return (
    <ConnectionContext.Provider value={{ status, latencyMs }}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnectionStatus(): ConnectionContextValue {
  return useContext(ConnectionContext)
}
