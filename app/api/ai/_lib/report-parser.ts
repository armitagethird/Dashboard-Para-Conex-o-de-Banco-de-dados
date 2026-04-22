import type { ReportData, ReportTipo } from '@/types/ai-reports'

export interface ParsedReport {
  titulo: string
  resumo: string
  anomalies_found: boolean
}

export function parseReportText(
  text: string,
  tipo: ReportTipo,
  referenceDate: Date,
  data: ReportData
): ParsedReport {
  const tipoLabel = { diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }[tipo]

  let dataLabel: string
  if (tipo === 'diario') {
    dataLabel = referenceDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } else if (tipo === 'semanal') {
    const inicioStr = new Date(data.periodStart).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    })
    const fimStr = new Date(data.periodEnd).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    })
    dataLabel = `${inicioStr} a ${fimStr}`
  } else {
    dataLabel = referenceDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
  }

  const titulo = `Relatório ${tipoLabel} · ${dataLabel}`

  const linhas = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 30)

  const primeiroParagrafo = linhas[0] ?? ''
  const resumo =
    primeiroParagrafo.length > 220
      ? primeiroParagrafo.slice(0, 220).trimEnd() + '…'
      : primeiroParagrafo

  const anomalies_found =
    data.cancelamentosExcessivos ||
    data.turnosComDivergencia > 0 ||
    data.itensAbaixoMinimo.length > 0

  return { titulo, resumo, anomalies_found }
}
