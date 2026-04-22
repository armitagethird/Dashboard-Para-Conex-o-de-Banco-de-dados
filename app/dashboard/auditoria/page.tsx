import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { AuditContent } from './audit-content'
import LoadingAuditoria from './loading'

export const metadata: Metadata = {
  title: 'Auditoria · Paraíso Motel',
  robots: { index: false, follow: false },
}

interface AuditoriaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  const params = await searchParams
  return (
    <div className="flex flex-col h-full">
      <Header pageTitle="Auditoria" />
      <Suspense fallback={<LoadingAuditoria />}>
        <AuditContent searchParams={params} />
      </Suspense>
    </div>
  )
}
