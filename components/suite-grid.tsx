'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { SuiteCard } from './suite-card'
import { SuiteDetailSheet } from './suite-detail-sheet'
import { getAlertasPendentesClient } from '@/lib/queries/suites-client'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { staggerEntrance } from '@/lib/animations'
import type { SuiteLive, SuiteStatus, AlertaPendente } from '@/types/dashboard'

interface SuiteGridProps {
  initialSuites: SuiteLive[]
}

const STATUS_LABELS: Record<SuiteStatus, string> = {
  free:        'Livres',
  occupied:    'Ocupadas',
  cleaning:    'Limpeza',
  maintenance: 'Manutenção',
}

const STATUS_COLORS: Record<SuiteStatus, string> = {
  free:        '#22C55E',
  occupied:    '#C41E20',
  cleaning:    '#F59E0B',
  maintenance: '#6366F1',
}

const STATUS_LABEL_SINGULAR: Record<SuiteStatus, string> = {
  free:        'Livre',
  occupied:    'Ocupada',
  cleaning:    'Limpeza',
  maintenance: 'Manutenção',
}

function log(event: string, detail?: unknown) {
  console.info(`[suites-live] ${event}`, detail ?? '')
}

export function SuiteGrid({ initialSuites }: SuiteGridProps) {
  const [suites, setSuites] = useState<SuiteLive[]>(initialSuites)
  const [alertas, setAlertas] = useState<AlertaPendente[]>([])
  const [selectedSuite, setSelectedSuite] = useState<SuiteLive | null>(null)
  const suitesRef = useRef<SuiteLive[]>(initialSuites)
  const supabaseRef = useRef(createClient())
  const cancelledRef = useRef(false)

  useEffect(() => {
    suitesRef.current = suites
  })

  async function fetchSuites() {
    const { data, error } = await supabaseRef.current
      .from('v_suites_live')
      .select('*')
      .order('numero')
    if (cancelledRef.current) return
    if (error) {
      log('fetchSuites error', error.message)
      return
    }
    if (!data) return
    // Dedupe por suite.id mantendo SEMPRE a stay mais recente (maior opened_at).
    // Se a view retorna múltiplas linhas (stays fantasmas na mesma suíte),
    // evitamos mostrar dados antigos.
    const byId = new Map<string, SuiteLive>()
    for (const row of data as SuiteLive[]) {
      const existing = byId.get(row.id)
      if (!existing) {
        byId.set(row.id, row)
        continue
      }
      const existingTime = existing.opened_at ? new Date(existing.opened_at).getTime() : 0
      const rowTime = row.opened_at ? new Date(row.opened_at).getTime() : 0
      if (rowTime > existingTime) {
        byId.set(row.id, row)
        log('duplicate suite in view; keeping most recent', { suite: row.numero, kept: row.stay_id })
      }
    }
    const unique = Array.from(byId.values()).sort((a, b) => a.numero - b.numero)

    // Detectar mudança de status e emitir toast
    const prev = suitesRef.current
    for (const next of unique) {
      const old = prev.find((s) => s.id === next.id)
      if (old && old.status !== next.status) {
        toast(
          `Suíte ${String(next.numero).padStart(2, '0')} → ${STATUS_LABEL_SINGULAR[next.status]}`,
          {
            description:
              next.status === 'occupied' && next.funcionario_nome
                ? `Recebida por ${next.funcionario_nome}`
                : undefined,
            duration: 4000,
          }
        )
      }
    }

    setSuites(unique)
  }

  async function fetchAlertas() {
    const data = await getAlertasPendentesClient()
    if (cancelledRef.current) return
    setAlertas(data)
  }

  async function refreshAll() {
    await Promise.all([fetchSuites(), fetchAlertas()])
  }

  // Polling de fallback + revalidate ao voltar pra aba
  const { lastUpdated, markUpdated } = useAutoRefresh({
    fetchFn: refreshAll,
    pollIntervalMs: 60_000,
    visibilityThresholdMs: 10_000,
  })

  useEffect(() => {
    cancelledRef.current = false
    const supabase = supabaseRef.current
    let channel = supabase.channel('suites-live')
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempt = 0

    function attachListeners(c: typeof channel) {
      c.on('postgres_changes', { event: '*', schema: 'public', table: 'stays' }, (payload) => {
        log('stays change', payload.eventType)
        fetchSuites().then(() => {
          markUpdated()
        })
        fetchAlertas()
      })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suites' }, (payload) => {
          log('suites update', payload.new)
          fetchSuites().then(() => {
            markUpdated()
          })
        })
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

    function scheduleReconnect() {
      if (reconnectTimer || cancelledRef.current) return
      const delay = Math.min(2_000 * 2 ** reconnectAttempt, 30_000)
      reconnectAttempt++
      log('scheduling reconnect', `${delay}ms (attempt ${reconnectAttempt})`)
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        supabase.removeChannel(channel)
        channel = supabase.channel('suites-live')
        subscribe()
        // Revalida dados ao reconectar (pode ter perdido eventos)
        refreshAll().then(() => markUpdated())
      }, delay)
    }

    fetchAlertas()
    setTimeout(() => staggerEntrance('.suite-card'), 50)
    subscribe()

    return () => {
      cancelledRef.current = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedAlertas = selectedSuite
    ? alertas.filter((a) =>
        (selectedSuite.stay_id && a.referencia_id === selectedSuite.stay_id) ||
        a.referencia_id === selectedSuite.id
      )
    : []

  const keepSelectedFresh = selectedSuite
    ? suites.find((s) => s.id === selectedSuite.id) ?? selectedSuite
    : null

  const counts = (['free', 'occupied', 'cleaning', 'maintenance'] as SuiteStatus[]).map((s) => ({
    status: s,
    count: suites.filter((suite) => suite.status === s).length,
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Status pills */}
      <div className="flex items-center flex-wrap gap-3">
        {counts.map(({ status, count }) =>
          count > 0 ? (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${STATUS_COLORS[status]}18`,
                color: STATUS_COLORS[status],
                border: `1px solid ${STATUS_COLORS[status]}30`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              {count} {STATUS_LABELS[status]}
            </span>
          ) : null
        )}
        <div className="ml-auto">
          <LastUpdated timestamp={lastUpdated} />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {suites.map((suite) => (
          <div key={suite.id} className="suite-card">
            <SuiteCard suite={suite} onClick={() => setSelectedSuite(suite)} />
          </div>
        ))}
      </div>

      {suites.length === 0 && (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Nenhuma suíte encontrada.
        </div>
      )}

      <SuiteDetailSheet
        suite={keepSelectedFresh}
        alertas={selectedAlertas}
        open={selectedSuite !== null}
        onClose={() => setSelectedSuite(null)}
      />
    </div>
  )
}

function LastUpdated({ timestamp }: { timestamp: number }) {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000)
    return () => clearInterval(id)
  }, [])

  const ageMs = now - timestamp
  const stale = ageMs > 90_000
  const relative = formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR })

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest"
      style={{ color: stale ? '#F59E0B' : 'var(--text-tertiary)' }}
    >
      <RefreshCw
        className="w-3 h-3"
        style={{ animation: stale ? 'none' : 'realtimePulse 3s ease-in-out infinite' }}
      />
      Atualizado {relative}
    </span>
  )
}
