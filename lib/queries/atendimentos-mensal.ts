import { createClient } from '@/lib/supabase/server'
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  getDate,
  getDaysInMonth,
  format,
  isSameMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface AtendimentosComparativoEntry {
  dia: number
  mesAtual: number | null
  mesAnterior: number | null
}

export interface AtendimentosComparativo {
  dados: AtendimentosComparativoEntry[]
  totalAtual: number
  totalAnterior: number
  deltaPercent: number
  diasDecorridos: number
  diasNoMes: number
  mesAtualLabel: string
  mesAnteriorLabel: string
  baseYear: number
  baseMonth: number
  compareYear: number
  compareMonth: number
  baseIsCurrent: boolean
}

export interface MesOpcao {
  year: number
  month: number
  label: string
}

interface StayRow {
  id: string
  opened_at: string
}

const MESES_NO_SELECT = 24

export function listarUltimos24Meses(): MesOpcao[] {
  const hoje = new Date()
  const opcoes: MesOpcao[] = []
  for (let i = 0; i < MESES_NO_SELECT; i++) {
    const d = subMonths(hoje, i)
    opcoes.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: capitalize(format(d, 'MMMM yyyy', { locale: ptBR })),
    })
  }
  return opcoes
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function makeDate(year: number, month: number): Date {
  return new Date(year, month - 1, 1)
}

interface Params {
  baseYear?: number
  baseMonth?: number
  compareYear?: number
  compareMonth?: number
}

export async function getAtendimentosMensalComparativo(
  params: Params = {}
): Promise<AtendimentosComparativo> {
  const hoje = new Date()
  const baseDate = makeDate(
    params.baseYear ?? hoje.getFullYear(),
    params.baseMonth ?? hoje.getMonth() + 1
  )
  const compareDate = makeDate(
    params.compareYear ?? subMonths(hoje, 1).getFullYear(),
    params.compareMonth ?? subMonths(hoje, 1).getMonth() + 1
  )

  const supabase = await createClient()
  const inicioBase = startOfMonth(baseDate)
  const fimBase = endOfMonth(baseDate)
  const inicioCompare = startOfMonth(compareDate)
  const fimCompare = endOfMonth(compareDate)

  const baseIsCurrent = isSameMonth(baseDate, hoje)
  const diasNoMesBase = getDaysInMonth(baseDate)
  const diasNoMesCompare = getDaysInMonth(compareDate)
  const diasNoEixo = Math.max(diasNoMesBase, diasNoMesCompare)
  const diasDecorridos = baseIsCurrent ? getDate(hoje) : diasNoMesBase

  const baseLabel = capitalize(format(baseDate, 'MMMM yyyy', { locale: ptBR }))
  const compareLabel = capitalize(
    format(compareDate, 'MMMM yyyy', { locale: ptBR })
  )

  const inicioMaisAntigo =
    inicioBase < inicioCompare ? inicioBase : inicioCompare
  const fimMaisRecente = fimBase > fimCompare ? fimBase : fimCompare

  const { data, error } = await supabase
    .from('stays')
    .select('id, opened_at')
    .is('void_approved_by', null)
    .gte('opened_at', inicioMaisAntigo.toISOString())
    .lte('opened_at', fimMaisRecente.toISOString())

  if (error) {
    return {
      dados: Array.from({ length: diasNoEixo }, (_, i) => ({
        dia: i + 1,
        mesAtual: null,
        mesAnterior: null,
      })),
      totalAtual: 0,
      totalAnterior: 0,
      deltaPercent: 0,
      diasDecorridos,
      diasNoMes: diasNoMesBase,
      mesAtualLabel: baseLabel,
      mesAnteriorLabel: compareLabel,
      baseYear: baseDate.getFullYear(),
      baseMonth: baseDate.getMonth() + 1,
      compareYear: compareDate.getFullYear(),
      compareMonth: compareDate.getMonth() + 1,
      baseIsCurrent,
    }
  }

  const rows = (data ?? []) as StayRow[]
  const contagemBase = new Map<number, number>()
  const contagemCompare = new Map<number, number>()

  for (const row of rows) {
    const d = new Date(row.opened_at)
    const dia = getDate(d)
    if (d >= inicioBase && d <= fimBase) {
      contagemBase.set(dia, (contagemBase.get(dia) ?? 0) + 1)
    } else if (d >= inicioCompare && d <= fimCompare) {
      contagemCompare.set(dia, (contagemCompare.get(dia) ?? 0) + 1)
    }
  }

  const dados: AtendimentosComparativoEntry[] = Array.from(
    { length: diasNoEixo },
    (_, i) => {
      const dia = i + 1
      const mesAtual =
        dia <= diasNoMesBase &&
        (!baseIsCurrent || dia <= diasDecorridos)
          ? contagemBase.get(dia) ?? 0
          : null
      const mesAnterior =
        dia <= diasNoMesCompare ? contagemCompare.get(dia) ?? 0 : null
      return { dia, mesAtual, mesAnterior }
    }
  )

  let totalAtual = 0
  for (const v of contagemBase.values()) totalAtual += v
  let totalAnterior = 0
  for (const v of contagemCompare.values()) totalAnterior += v

  const deltaPercent =
    totalAnterior > 0
      ? Math.round((totalAtual / totalAnterior - 1) * 100)
      : totalAtual > 0
        ? 100
        : 0

  return {
    dados,
    totalAtual,
    totalAnterior,
    deltaPercent,
    diasDecorridos,
    diasNoMes: diasNoMesBase,
    mesAtualLabel: baseLabel,
    mesAnteriorLabel: compareLabel,
    baseYear: baseDate.getFullYear(),
    baseMonth: baseDate.getMonth() + 1,
    compareYear: compareDate.getFullYear(),
    compareMonth: compareDate.getMonth() + 1,
    baseIsCurrent,
  }
}
