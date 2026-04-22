import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSuitesLive } from '@/lib/queries/suites'
import { SuiteGrid } from '@/components/suite-grid'
import { Header } from '@/components/header'
import LoadingSuites from './loading'

export const metadata: Metadata = {
  title: 'Suítes ao Vivo · Paraíso Motel',
  robots: { index: false, follow: false },
}

export default async function SuitesPage() {
  const suites = await getSuitesLive()

  return (
    <div className="flex flex-col h-full">
      <Header pageTitle="Suítes ao Vivo" realtimeStatus="connecting" />
      <Suspense fallback={<LoadingSuites />}>
        <SuiteGrid initialSuites={suites} />
      </Suspense>
    </div>
  )
}
