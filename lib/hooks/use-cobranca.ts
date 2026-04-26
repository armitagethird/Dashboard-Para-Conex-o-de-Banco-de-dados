'use client'

import { useEffect, useState } from 'react'
import { calcCobranca, type Cobranca } from '@/lib/billing'
import type { SuiteLive } from '@/types/dashboard'

export function useCobranca(suite: SuiteLive | null | undefined): Cobranca | null {
  const ativa = !!(suite && suite.status === 'occupied' && suite.opened_at)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!ativa) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [ativa])

  if (!suite || !ativa || !suite.opened_at) return null

  return calcCobranca({
    openedAt: new Date(suite.opened_at),
    now: new Date(now),
    stayType: suite.modalidade,
    stayPrice: suite.valor_base,
    precos: suite.precos,
  })
}
