import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { LiveRefresher } from '@/components/live-refresher'
import { AuditContent } from './audit-content'
import LoadingAuditoria from './loading'

export const metadata: Metadata = {
  title: 'Auditoria · Paraíso Motel',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

interface AuditoriaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  const params = await searchParams
  return (
    <div className="flex flex-col h-full">
      <Header pageTitle="Auditoria" />
      <LiveRefresher channelName="auditoria-live" tables={['audit_log']} pollIntervalMs={90_000} />
      <Suspense fallback={<LoadingAuditoria />}>
        <AuditContent searchParams={params} />
      </Suspense>
    </div>
  )
}
