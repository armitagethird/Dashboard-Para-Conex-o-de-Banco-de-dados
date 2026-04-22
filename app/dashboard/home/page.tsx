import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportSection } from '@/components/ai-reports/report-section'
import { Header } from '@/components/header'
import type { AiReport } from '@/types/ai-reports'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Início · Paraíso Motel',
  robots: { index: false, follow: false },
}

export const revalidate = 300

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [diario, semanal, mensal] = await Promise.all([
    supabase
      .from('ai_reports')
      .select('*')
      .eq('tipo', 'diario')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ai_reports')
      .select('*')
      .eq('tipo', 'semanal')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ai_reports')
      .select('*')
      .eq('tipo', 'mensal')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const reports = {
    diario: diario.data as AiReport | null,
    semanal: semanal.data as AiReport | null,
    mensal: mensal.data as AiReport | null,
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header pageTitle="Início" />
      <div className="p-4 lg:p-6 pb-28 lg:pb-6">
        <ReportSection reports={reports} />
      </div>
    </div>
  )
}
