'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface LiveRefresherProps {
  channelName: string
  tables: string[]
  pollIntervalMs?: number
  debounceMs?: number
}

/**
 * Mantém um Server Component atualizado ao vivo.
 * Escuta mudanças nas tabelas do Supabase Realtime e invoca router.refresh()
 * para reexecutar os Server Components da página.
 */
export function LiveRefresher({
  channelName,
  tables,
  pollIntervalMs = 60_000,
  debounceMs = 300,
}: LiveRefresherProps) {
  const router = useRouter()
  const tablesRef = useRef(tables)

  useEffect(() => {
    tablesRef.current = tables
  })

  useEffect(() => {
    function log(event: string, detail?: unknown) {
      console.info(`[${channelName}] ${event}`, detail ?? '')
    }

    const supabase = createClient()
    let channel = supabase.channel(channelName)
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempt = 0
    let pendingRefresh: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    function scheduleRefresh() {
      if (pendingRefresh) return
      pendingRefresh = setTimeout(() => {
        pendingRefresh = null
        if (cancelled) return
        log('router.refresh')
        router.refresh()
      }, debounceMs)
    }

    function attachListeners(c: typeof channel) {
      for (const table of tablesRef.current) {
        c.on('postgres_changes', { event: '*', schema: 'public', table }, (p) => {
          log(`${table} change`, p.eventType)
          scheduleRefresh()
        })
      }
    }

    function scheduleReconnect() {
      if (reconnectTimer || cancelled) return
      const delay = Math.min(2_000 * 2 ** reconnectAttempt, 30_000)
      reconnectAttempt++
      log('reconnect scheduled', `${delay}ms (attempt ${reconnectAttempt})`)
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        supabase.removeChannel(channel)
        channel = supabase.channel(channelName)
        subscribe()
        router.refresh()
      }, delay)
    }

    function subscribe() {
      attachListeners(channel)
      channel.subscribe((status) => {
        log('channel status', status)
        if (status === 'SUBSCRIBED') {
          reconnectAttempt = 0
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          scheduleReconnect()
        }
      })
    }

    subscribe()

    let hiddenSince: number | null = null
    function onVisibility() {
      if (document.hidden) {
        hiddenSince = Date.now()
        return
      }
      if (hiddenSince && Date.now() - hiddenSince > 10_000) {
        log('visibility refresh')
        router.refresh()
      }
      hiddenSince = null
    }
    document.addEventListener('visibilitychange', onVisibility)

    const pollId = setInterval(() => {
      log('poll refresh')
      router.refresh()
    }, pollIntervalMs)

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (pendingRefresh) clearTimeout(pendingRefresh)
      clearInterval(pollId)
      document.removeEventListener('visibilitychange', onVisibility)
      supabase.removeChannel(channel)
    }
  }, [router, channelName, pollIntervalMs, debounceMs])

  return null
}
