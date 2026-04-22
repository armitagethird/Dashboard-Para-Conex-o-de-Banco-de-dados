export type ReportTipo = 'diario' | 'semanal' | 'mensal'
export type ReportStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AiReport {
  id: string
  tipo: ReportTipo
  period_start: string
  period_end: string
  titulo: string
  resumo: string
  report_text: string
  anomalies_found: boolean
  anomalias_count: number
  receita_periodo: number | null
  total_atendimentos: number
  gerado_manualmente: boolean
  metadata: ReportMetadata | null
  created_at: string
}

export interface ReportMetadata {
  model: string
  input_tokens: number
  output_tokens: number
  duration_ms: number
  generated_at: string
}

export interface SuiteEmUso {
  numero: string
  tipo: string
  minutosAberta: number
  tipoPeriodo: 'hora' | 'pernoite'
  formaPagamento: string | null
  valorEsperado: number | null
}

export interface SituacaoAtual {
  suitesEmUso: SuiteEmUso[]
  totalEmUso: number
  receitaEmAberto: number
  temStaysAbertas: boolean
}

export interface ReportData {
  totalAtendimentos: number
  atendimentosConcluidos: number
  atendimentosVoidados: number
  receitaConfirmada: number
  receitaPendente: number
  ticketMedio: number
  distribuicaoPagamento: Record<string, number>

  turnos: TurnoData[]
  turnosComDivergencia: number
  turnosAbertos: number

  suitesTotais: number
  suitesOcupadas: number
  taxaOcupacao: number
  suitesMaisUsadas: SuiteUsada[]

  movimentacoesEstoque: number
  itensAbaixoMinimo: ItemEstoque[]

  totalEventosAudit: number
  voidsPorFuncionario: FuncionarioContagem[]
  cancelamentosExcessivos: boolean

  situacaoAtual: SituacaoAtual

  periodStart: string
  periodEnd: string
}

export interface TurnoData {
  funcionario: string
  inicio: string
  fim: string | null
  expectedCash: number | null
  reportedCash: number | null
  diferenca: number | null
  status: 'open' | 'closed'
}

export interface SuiteUsada {
  numero: string
  tipo: string
  atendimentos: number
}

export interface ItemEstoque {
  nome: string
  qtdAtual: number
  minimo: number
}

export interface FuncionarioContagem {
  nome: string
  quantidade: number
}

export interface GenerateRequest {
  tipo: ReportTipo
  manual?: boolean
}

export interface GenerateResponse {
  success: boolean
  report?: AiReport
  error?: string
  cooldown_remaining_minutes?: number
  tokens?: {
    input: number
    output: number
    custo_usd: string
  }
  duration_ms?: number
}
