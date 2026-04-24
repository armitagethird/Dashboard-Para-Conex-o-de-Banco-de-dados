import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callGemini } from '../_lib/gemini'
import {
  fetchDataForPeriod,
  getPeriodDiario,
  getPeriodSemanal,
  getPeriodMensal,
} from '../_lib/data-fetcher'
import {
  SYSTEM_INSTRUCTION,
  buildDailyPrompt,
  buildWeeklyPrompt,
  buildMonthlyPrompt,
} from '../_lib/prompts'
import { parseReportText } from '../_lib/report-parser'
import type { ReportTipo, GenerateResponse, AiReport, ReportData } from '@/types/ai-reports'

interface GeminiResult {
  text: string
  inputTokens: number
  outputTokens: number
}

interface ParsedReport {
  titulo: string
  resumo: string
  anomalies_found: boolean
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function runGeneration(
  tipo: ReportTipo,
  isManual: boolean
): Promise<NextResponse<GenerateResponse>> {
  const startTime = Date.now()
  const now = new Date()

  // ── Rate limiting para geração manual ──────────────────────────────────────
  if (isManual) {
    const COOLDOWN_MINUTES: Record<ReportTipo, number> = {
      diario: 1,
      semanal: 3,
      mensal: 5,
    }
    const cooldown = COOLDOWN_MINUTES[tipo]
    const cutoff = new Date(Date.now() - cooldown * 60 * 1000).toISOString()
    const sb = adminClient()
    const { data: recente } = await sb
      .from('ai_reports')
      .select('created_at')
      .eq('tipo', tipo)
      .eq('gerado_manualmente', true)
      .gte('created_at', cutoff)
      .limit(1)
      .maybeSingle()

    if (recente) {
      const minutosRestantes = Math.ceil(
        (new Date(recente.created_at as string).getTime() + cooldown * 60 * 1000 - Date.now()) /
          60000
      )
      return NextResponse.json(
        {
          success: false,
          error: `Aguarde ${minutosRestantes} minuto${minutosRestantes > 1 ? 's' : ''} para gerar outro relatório ${tipo}.`,
          cooldown_remaining_minutes: minutosRestantes,
        },
        { status: 429 }
      )
    }
  }

  let period: { start: Date; end: Date }
  let referenceDate: Date
  let data: ReportData
  let userPrompt: string

  if (tipo === 'diario') {
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    referenceDate = isManual ? now : yesterday
    period = getPeriodDiario(referenceDate)
    data = await fetchDataForPeriod(period.start, period.end)
    userPrompt = buildDailyPrompt(data, referenceDate)
  } else if (tipo === 'semanal') {
    referenceDate = now
    period = getPeriodSemanal()
    data = await fetchDataForPeriod(period.start, period.end)
    userPrompt = buildWeeklyPrompt(data)
  } else {
    referenceDate = now
    period = getPeriodMensal()
    data = await fetchDataForPeriod(period.start, period.end)
    userPrompt = buildMonthlyPrompt(data)
  }

  const gemini = await callGemini(SYSTEM_INSTRUCTION, userPrompt)
  const parsed = parseReportText(gemini.text, tipo, referenceDate, data)

  return saveAndRespond(adminClient(), tipo, period, gemini, parsed, data, isManual, startTime)
}

async function saveAndRespond(
  sb: ReturnType<typeof adminClient>,
  tipo: ReportTipo,
  period: { start: Date; end: Date },
  gemini: GeminiResult,
  parsed: ParsedReport,
  data: ReportData,
  isManual: boolean,
  startTime: number
): Promise<NextResponse<GenerateResponse>> {
  const duration = Date.now() - startTime
  const custoUsd =
    (gemini.inputTokens / 1_000_000) * 0.1 +
    (gemini.outputTokens / 1_000_000) * 0.4

  const { data: inserted, error } = await sb
    .from('ai_reports')
    .insert({
      tipo,
      period_start: period.start.toISOString(),
      period_end: period.end.toISOString(),
      titulo: parsed.titulo,
      resumo: parsed.resumo,
      report_text: gemini.text,
      anomalies_found: parsed.anomalies_found,
      anomalias_count:
        (data.cancelamentosExcessivos ? 1 : 0) +
        data.turnosComDivergencia +
        data.itensAbaixoMinimo.length,
      receita_periodo: data.receitaConfirmada,
      total_atendimentos: data.totalAtendimentos,
      gerado_manualmente: isManual,
      metadata: {
        model: 'gemini-2.5-flash-lite',
        input_tokens: gemini.inputTokens,
        output_tokens: gemini.outputTokens,
        duration_ms: duration,
        generated_at: new Date().toISOString(),
        data_snapshot: {
          receita_confirmada: data.receitaConfirmada,
          receita_pendente: data.receitaPendente,
          receita_em_aberto: data.situacaoAtual.receitaEmAberto,
          atendimentos_total: data.totalAtendimentos,
          atendimentos_concluidos: data.atendimentosConcluidos,
          atendimentos_voidados: data.atendimentosVoidados,
          ticket_medio: data.ticketMedio,
          stays_abertas_agora: data.situacaoAtual.totalEmUso,
          suite_top: data.suitesMaisUsadas[0]
            ? `Suíte ${data.suitesMaisUsadas[0].numero} (${data.suitesMaisUsadas[0].atendimentos}x)`
            : null,
          item_top: data.itensMaisVendidos[0]
            ? `${data.itensMaisVendidos[0].nome} (${data.itensMaisVendidos[0].quantidade})`
            : null,
          turnos_com_divergencia: data.turnosComDivergencia,
        },
      },
    })
    .select()
    .single()

  if (error) {
    console.error('[AI Generate] Erro ao salvar:', error)
    return NextResponse.json(
      { success: false, error: 'Falha ao salvar relatório' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    report: inserted as AiReport,
    tokens: {
      input: gemini.inputTokens,
      output: gemini.outputTokens,
      custo_usd: custoUsd.toFixed(6),
    },
    duration_ms: duration,
  })
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateResponse>> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const sbUser = await createServerClient()
    const {
      data: { user },
    } = await sbUser.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await sbUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as { role: string }).role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>) as {
    tipo?: string
    manual?: boolean
  }
  const tipo = body.tipo as ReportTipo | undefined

  if (!tipo || !['diario', 'semanal', 'mensal'].includes(tipo)) {
    return NextResponse.json(
      { success: false, error: 'Campo "tipo" obrigatório: diario | semanal | mensal' },
      { status: 400 }
    )
  }

  const isManual = body.manual === true

  try {
    return await runGeneration(tipo, isManual)
  } catch (err) {
    console.error('[AI Generate] Erro:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<GenerateResponse>> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const hour = now.getUTCHours()
  const dayOfWeek = now.getUTCDay()
  const dayOfMonth = now.getUTCDate()

  let tipo: ReportTipo
  if (dayOfMonth === 1 && hour === 13) {
    tipo = 'mensal'
  } else if (dayOfWeek === 1 && hour === 12) {
    tipo = 'semanal'
  } else {
    tipo = 'diario'
  }

  try {
    return await runGeneration(tipo, false)
  } catch (err) {
    console.error('[AI Generate Cron] Erro:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
