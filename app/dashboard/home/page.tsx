import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportSection } from '@/components/ai-reports/report-section'
import { AtendimentosComparativoChart } from '@/components/atendimentos-comparativo-chart'
import { Header } from '@/components/header'
import {
  getAtendimentosMensalComparativo,
  listarUltimos24Meses,
} from '@/lib/queries/atendimentos-mensal'
import type { AiReport } from '@/types/ai-reports'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Início · Paraíso Motel',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function spInt(
  params: Record<string, string | string[] | undefined>,
  key: string
): number | undefined {
  const v = params[key]
  const raw = Array.isArray(v) ? v[0] : v
  if (!raw) return undefined
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : undefined
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const filtros = {
    baseYear: spInt(params, 'base_year'),
    baseMonth: spInt(params, 'base_month'),
    compareYear: spInt(params, 'compare_year'),
    compareMonth: spInt(params, 'compare_month'),
  }

  const [diario, semanal, mensal, atendimentos] = await Promise.all([
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
    getAtendimentosMensalComparativo(filtros),
  ])

  const reports = {
    diario: diario.data as AiReport | null,
    semanal: semanal.data as AiReport | null,
    mensal: mensal.data as AiReport | null,
  }

  const opcoesMeses = listarUltimos24Meses()

  return (
    <div className="flex flex-col min-h-full">
      <Header pageTitle="Início" />
      <div className="p-4 lg:p-6 pb-28 lg:pb-6">
        <ReportSection reports={reports} />
        <div className="mt-6 lg:mt-8">
          <AtendimentosComparativoChart
            data={atendimentos}
            opcoesMeses={opcoesMeses}
          />
        </div>
      </div>
    </div>
  )
}
