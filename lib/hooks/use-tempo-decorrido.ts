'use client'

import { useEffect, useState } from 'react'
import { differenceInMinutes } from 'date-fns'

function format(openedAt: string | null | undefined, now: number): string {
  if (!openedAt) return ''
  const diff = differenceInMinutes(now, new Date(openedAt))
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export function useTempoDecorrido(openedAt: string | null | undefined) {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!openedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [openedAt])

  return format(openedAt, now)
}
