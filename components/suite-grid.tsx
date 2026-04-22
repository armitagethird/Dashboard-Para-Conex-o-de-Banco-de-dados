'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SuiteCard } from './suite-card'
import { RealtimeDot } from './realtime-dot'
import { staggerEntrance } from '@/lib/animations'
import type { SuiteLive, SuiteStatus } from '@/types/dashboard'

interface SuiteGridProps {
  initialSuites: SuiteLive[]
  onRealtimeStatusChange?: (status: 'connected' | 'disconnected' | 'connecting') => void
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

export function SuiteGrid({ initialSuites, onRealtimeStatusChange }: SuiteGridProps) {
  const [suites, setSuites] = useState<SuiteLive[]>(initialSuites)
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')

  const fetchSuites = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('v_suites_live').select('*').order('numero')
    if (data) {
      const seen = new Set<string>()
      const unique = (data as SuiteLive[]).filter((row) => {
        if (seen.has(row.id)) return false
        seen.add(row.id)
        return true
      })
      setSuites(unique)
      setTimeout(() => staggerEntrance('.suite-card'), 50)
    }
  }, [])

  useEffect(() => {
    setTimeout(() => staggerEntrance('.suite-card'), 50)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('suites-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stays' }, () => {
        fetchSuites()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suites' }, () => {
        fetchSuites()
      })
      .subscribe((status) => {
        const s = status === 'SUBSCRIBED' ? 'connected' : 'disconnected'
        setRealtimeStatus(s)
        onRealtimeStatusChange?.(s)
      })

    return () => { supabase.removeChannel(channel) }
  }, [fetchSuites, onRealtimeStatusChange])

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
          <RealtimeDot status={realtimeStatus} />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {suites.map((suite, i) => (
          <div key={`${suite.id}-${i}`} className="suite-card">
            <SuiteCard suite={suite} />
          </div>
        ))}
      </div>

      {suites.length === 0 && (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Nenhuma suíte encontrada.
        </div>
      )}
    </div>
  )
}
